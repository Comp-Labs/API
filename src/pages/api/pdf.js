const createBrowser = require('browserless')

export default async function handler(request, response) {
	const { margin, printBackground, scale } = request.query;
	const cache = {};
	// return response.send(`Hello ${name}!`);
	try {
		// Only allow GET requests
		if (request.method !== 'GET') return response.status(405).send(`Only GET requests allowed`).end()

		let url = decodeURIComponent(request.query.url);

		// Check if the pdf is already cached
		if (cache[url]) {
			console.log('Serving from cache:', url);
			res.set('Content-Type', 'application/pdf');
			res.send(cache[url]);
			return;
		}

		// Strip leading slash from request path
		// const url = request.url.replace(/^\/+/, '')

		// Prepend "http://" if the URL doesn't start with a protocol
		if (!/^https?:\/\//i.test(url)) {
			url = `http://${url}`;
		}

		const browser = createBrowser()
		const browserless = await browser.createContext()

		// Block favicon.ico requests from reaching puppeteer
		if (url === 'favicon.ico') return response.status(404).end()

		console.log(`Converting ${url}`)
		const pdfBuffer = await browserless.pdf(url, { margin: '0cm', printBackground: true, format: 'A4' })
		// if(pdfBuffer) return response.status(200).send(`PDF generated`)

		if (!pdfBuffer) return response.status(400).send('Error: Could not generate PDF')

		// Instruct browser to cache PDF for maxAge ms
		if (process.env.NODE_ENV !== 'development') response.setHeader('Cache-control', `public, max-age=${maxAge}`)

		// Set Content type to PDF and send the PDF to the client
		response.setHeader('Content-type', 'application/pdf')
		response.send(pdfBuffer)

		await browserless.destroyContext()
		await browser.close()

	} catch (error) {
		if (error.message === 'Protocol error (Page.navigate): Cannot navigate to invalid URL')
			return response.status(404).send(`Error: URL is invalid.`).end()

		console.error(error)
		response.status(500).send('Error: Please try again.')
	}
}