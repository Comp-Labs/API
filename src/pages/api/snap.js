// const createBrowser = require('browserless');
const chromium = require('chrome-aws-lambda');

export default async function handler(request, response) {
  // const { margin, printBackground, scale } = request.query;
  const cache = {};
  // return response.send(`Hello ${name}!`);
  try {
    // Only allow GET requests
    if (request.method !== 'GET') return response.status(405).send(`Only GET requests allowed`).end()

    let url = decodeURIComponent(request.query.url);

    // Check if the image is already cached
    if (cache[url]) {
      console.log('Serving from cache:', url);
      response.set('Content-Type', 'image/jpeg');
      response.send(cache[url]);
      return;
    }

    // Strip leading slash from request path
    // const url = request.url.replace(/^\/+/, '')

    // Prepend "http://" if the URL doesn't start with a protocol
    if (!/^https?:\/\//i.test(url)) {
      url = `http://${url}`;
    }

    let browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();

    // const browser = createBrowser()
    // const browserless = await browser.createContext()

    // Block favicon.ico requests from reaching puppeteer
    if (url === 'favicon.ico') return response.status(404).end()

    console.log(`Snapping ${url}`)
    // const buffer = await browserless.screenshot(url, { codeScheme: 'github', overlay: { browser: 'light' } })
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url);
    const buffer = await page.screenshot()
    // if (buffer) return response.status(200).send(`Screenshot generated in ${buffer.byteLength()} bytes`)

    if (!buffer) return response.status(400).send('Error: Could not generate screenshot')

    // Instruct browser to cache PDF for maxAge ms
    if (process.env.NODE_ENV !== 'development') response.setHeader('Cache-control', `public, max-age=${maxAge}`)

    // Set Content type to PDF and send the PDF to the client
    response.setHeader('Content-type', 'image/png')
    response.send(buffer)

    await browser.close();
    // await browserless.destroyContext()
    // await browser.close()

  } catch (error) {
    if (error.message === 'Protocol error (Page.navigate): Cannot navigate to invalid URL')
      return response.status(404).send(`Error: URL is invalid.`).end()

    console.error(error)
    response.status(500).send('Error: Please try again.')
  }
}