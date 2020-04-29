require('dotenv').config()

const express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	fs = require('file-system'),
	fetch = require('node-fetch'),
	{Octokit} = require('@octokit/rest'),
	accountSid = process.env.TWILIO_ACCOUNT_SID,
	authToken = process.env.TWILIO_AUTH_TOKEN,
	client = require('twilio')(accountSid, authToken),
	fileName = 'fax',
	ComputerVision = require('@azure/cognitiveservices-computervision'),
	ComputerVisionClient = ComputerVision.ComputerVisionClient,
	ComputerVisionModels = ComputerVision.ComputerVisionModels,
	CognitiveServicesCredentials = require('@azure/ms-rest-azure-js').CognitiveServicesCredentials 

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use('/files', express.static('files'))

app.get('/', (req, res) => {	
	res.send('<h1>Send and review Github PRs via Twilio Fax API</h1>')
})

app.post('/fax', (req, res) => {
	client.fax.faxes.create({
		from: '+61488845130',
		to: '+61488845130',
		mediaUrl: `https://github-fax.ngrok.io/files/${fileName}.pdf`
	})
	.then(fax => console.log(fax))
})

app.post('/sent', (req, res) => {
	const twiml = `<Response><Receive action="/receive" /></Response>`

	res.type('text/xml')
	res.send(twiml)
})

app.post('/receive', (req, res) => {
	console.log(req.body.MediaUrl)

	res.status(200)
	res.send()
})

app.post('/pr/open', (req, res) => {
	console.log(`A PR has been opened, check it out at ${req.body.pull_request.url}`)

	const data = {
		url: req.body.pull_request.url
	}

	fetch('https://github-fax.ngrok.io/create-pdf', {
		method: 'POST',
		body: JSON.stringify(data),
		headers: { 'Content-Type': 'application/json' }
	})

	res.sendStatus(200)
})

app.post('/create-pdf', (req, res) => {
	const url = req.body.url

	const PDFDocument = require('pdfkit'),
	doc = new PDFDocument

	doc.pipe(fs.createWriteStream(`./files/${fileName}.pdf`))

	doc.fontSize(40)

	doc.text('A new PR has been opened!')

	doc.fontSize(20)

	doc.text(`Check out the PR at ${url}`)

	doc.end()

	fetch('https://github-fax.ngrok.io/fax', {method: 'POST'})

	res.end()
})

app.post('/pr/comment', (req, res) => {
	const octokit = new Octokit({
		auth: {
			id: process.env.GITHUB_AUTH_ID,
			privateKey: process.env.GITHUB_AUTH_SECRET
		},
		userAgent: 'githubFax v17.6.0',
		timeZone: 'Australia/Perth',
	})

	console.log(octokit.request("GET /"))
})

app.post('/read', async (req, res) => {
	const cognitiveServiceCredentials = new CognitiveServicesCredentials(process.env.COMPUTER_VISION_KEY),
	client = new ComputerVisionClient(cognitiveServiceCredentials, process.env.COMPUTER_VISION_ENDPOINT)

	client.batchReadFile(`https://github-fax.ngrok.io/files/${fileName}.pdf`).then(result => {
		const operationId = result.operationLocation.replace(`${process.env.COMPUTER_VISION_ENDPOINT}/vision/v2.1/read/operations/`, '')

		client.getReadOperationResult(operationId).then(data => {
			let string = ''

			data.recognitionResults[0].lines.forEach(line => {
				string = `${string}${line.text}`
			})

			const matches = string.match(/https:\/\/api\.github\.com\/repos\/((\w|\d|-)+)\/((\w|\d|-|_)+)\/pulls\/((\d)+)/i),
			url = matches[0],
			username = matches[1],
			repo = matches[3],
			pr = matches[5]

			console.log({url, username, repo, pr})

		}).catch(err => console.log(err))
	}).catch(err => console.log(err))

	res.sendStatus(200)
})

app.listen(process.env.PORT || 3000, () => { 
	console.log(`Example app listening on port ${process.env.PORT || 3000}!`)
})
