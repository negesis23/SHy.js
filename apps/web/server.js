import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

const app = new Hono()

let vite;
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  })
  
  app.use('*', async (c, next) => {
    const viteRes = await new Promise((resolve) => {
      vite.middlewares(c.env.incoming, c.env.outgoing, () => resolve(false))
    })
    if (viteRes !== false) return
    await next()
  })
} else {
  app.use('/assets/*', serveStatic({ root: './dist/client' }))
}

app.get('*', async (c) => {
  try {
    const url = c.req.path
    let template, render

    if (!isProduction) {
      template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
    } else {
      template = fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8')
      render = (await import('./dist/server/entry-server.js')).render
    }

    const appHtml = render(url)
    const html = template.replace(`<!--app-html-->`, appHtml)

    return c.html(html)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.error(e.stack)
    return c.text(e.stack, 500)
  }
})

serve({
  fetch: app.fetch,
  port: 5173
}, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
})
