export interface DependencyEdge {
  source: SignalNode;
  observer: EffectNode;

  nextObserver: DependencyEdge | null;
  prevObserver: DependencyEdge | null;

  nextSource: DependencyEdge | null;
  prevSource: DependencyEdge | null;
}

export interface SignalNode {
  firstEdge: DependencyEdge | null;
}

export interface EffectNode {
  (): void;
  $$isMemo?: boolean;

  firstEdge?: DependencyEdge | null;
  cleanups?: (() => void)[] | null;

  isPending?: boolean;
  nextPending?: EffectNode | null;
  prevPending?: EffectNode | null;

  isTransitioningState?: boolean;
  nextTransition?: EffectNode | null;
  prevTransition?: EffectNode | null;
}

export type EffectFn = EffectNode;

export let currentEffect: EffectFn | null = null;
let errorHandlers: ((err: unknown) => void)[] = [];

export function pushErrorHandler(handler: (err: unknown) => void) {
  errorHandlers.push(handler);
}

export function popErrorHandler() {
  errorHandlers.pop();
}

export function runInErrorHandler(fn: () => void) {
  try {
    fn();
  } catch (err) {
    if (errorHandlers.length > 0) {
      errorHandlers[errorHandlers.length - 1](err);
    } else {
      console.error("SHy.js: Uncaught error in effect", err);
    }
  }
}

export function setCurrentEffect(v: EffectFn | null) {
  currentEffect = v;
}

// Edge Pool for zero-allocation Graph edges (Garbage Collection optimization)
let edgePool: DependencyEdge | null = null;

function createEdge(source: SignalNode, observer: EffectFn): DependencyEdge {
  if (edgePool) {
    const edge = edgePool;
    edgePool = edge.nextObserver;
    edge.source = source;
    edge.observer = observer;
    edge.nextObserver = edge.prevObserver = edge.nextSource = edge.prevSource = null;
    return edge;
  }
  return {
    source,
    observer,
    nextObserver: null,
    prevObserver: null,
    nextSource: null,
    prevSource: null
  };
}

function freeEdge(edge: DependencyEdge) {
  edge.source = null as any;
  edge.observer = null as any;
  edge.nextObserver = edgePool;
  edgePool = edge;
}

export function track(source: SignalNode) {
  if (!currentEffect) return;
  const edge = createEdge(source, currentEffect);

  // 1. Add to observer's (Effect's) source DLL
  edge.nextSource = currentEffect.firstEdge || null;
  if (currentEffect.firstEdge) {
    currentEffect.firstEdge.prevSource = edge;
  }
  currentEffect.firstEdge = edge;

  // 2. Add to source's (Signal's) observer DLL
  edge.nextObserver = source.firstEdge || null;
  if (source.firstEdge) {
    source.firstEdge.prevObserver = edge;
  }
  source.firstEdge = edge;
}

export function trigger(source: SignalNode) {
  let edge = source.firstEdge;
  // Convert linked list to an array to safely iterate, 
  // as effects might synchronously cause unsubscribes/resubscribes
  // For extreme O(1) we could traverse directly but this is safer for now 
  // without a more complex epoch/versioning system.
  // We avoid Set allocation, but we use an array. Still faster than Set.
  if (!edge) return;
  const subs: EffectNode[] = [];
  while (edge) {
    subs.push(edge.observer);
    edge = edge.nextObserver;
  }
  for (let i = 0; i < subs.length; i++) {
    notifyEffect(subs[i]);
  }
}

export function cleanupEffect(effect: EffectFn) {
  // 1. Unsubscribe from all sources (O(1) removal)
  let edge = effect.firstEdge;
  while (edge) {
    const next = edge.nextSource;
    // Remove from source's DLL
    if (edge.prevObserver) {
      edge.prevObserver.nextObserver = edge.nextObserver;
    } else if (edge.source) {
      edge.source.firstEdge = edge.nextObserver;
    }
    if (edge.nextObserver) {
      edge.nextObserver.prevObserver = edge.prevObserver;
    }
    
    freeEdge(edge);
    edge = next;
  }
  effect.firstEdge = null;

  // 2. Run and clear user cleanups
  if (effect.cleanups) {
    for (let i = 0; i < effect.cleanups.length; i++) {
      effect.cleanups[i]();
    }
    effect.cleanups = null;
  }
}

// Queue system using Doubly Linked Lists
let pendingHead: EffectNode | null = null;
let pendingTail: EffectNode | null = null;

let transitionHead: EffectNode | null = null;
let transitionTail: EffectNode | null = null;

export let microtaskQueued = false;
export let isTransitioning = false;

export function setTransitioning(v: boolean) {
  isTransitioning = v;
}

function pushPending(effect: EffectNode) {
  if (effect.isPending) return;
  effect.isPending = true;
  effect.prevPending = pendingTail;
  effect.nextPending = null;
  if (pendingTail) {
    pendingTail.nextPending = effect;
  } else {
    pendingHead = effect;
  }
  pendingTail = effect;
}

function pushTransition(effect: EffectNode) {
  if (effect.isTransitioningState) return;
  effect.isTransitioningState = true;
  effect.prevTransition = transitionTail;
  effect.nextTransition = null;
  if (transitionTail) {
    transitionTail.nextTransition = effect;
  } else {
    transitionHead = effect;
  }
  transitionTail = effect;
}

export function notifyEffect(subscriber: EffectFn) {
  if (subscriber.$$isMemo) {
    runInErrorHandler(() => subscriber());
  } else {
    if (isTransitioning) {
      pushTransition(subscriber);
    } else {
      pushPending(subscriber);
    }

    if (!microtaskQueued) {
      microtaskQueued = true;
      Promise.resolve().then(() => {
        microtaskQueued = false;
        
        // Flush Pending Queue
        let current = pendingHead;
        pendingHead = null;
        pendingTail = null;
        while (current) {
          current.isPending = false;
          const next = current.nextPending;
          current.prevPending = null;
          current.nextPending = null;
          runInErrorHandler(() => current!());
          current = next;
        }
        
        // Flush Transition Queue
        if (transitionHead) {
          let currTrans = transitionHead;
          transitionHead = null;
          transitionTail = null;
          while (currTrans) {
            currTrans.isTransitioningState = false;
            const next = currTrans.nextTransition;
            currTrans.prevTransition = null;
            currTrans.nextTransition = null;
            runInErrorHandler(() => currTrans!());
            currTrans = next;
          }
        }
      });
    }
  }
}
