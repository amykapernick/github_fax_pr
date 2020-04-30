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
		from: process.env.SEND_NUMBER,
		to: process.env.RECEIVE_NUMBER,
		mediaUrl: `https://github-fax.ngrok.io/${req.body.fileName}`
	})
	.then(fax => console.log(fax.sid))
})

app.post('/sent', (req, res) => {
	const twiml = `<Response><Receive action="/receive" /></Response>`

	res.type('text/xml')
	res.send(twiml)
})

app.post('/receive', (req, res) => {
	fetch('https://github-fax.ngrok.io/read', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({url: req.body.MediaUrl})
	})

	res.status(200)
	res.send()
})

app.post('/pr/open', (req, res) => {
	console.log(`A PR has been opened, check it out at ${req.body.pull_request.url}`)

	let data = {
		url: req.body.pull_request.url
	}

	if(!['opened', 'assigned'].includes(req.body.action)) {
		res.sendStatus(200)

		return
	}

	if(req.body.requested_reviewers) {
		req.body.requested_reviewers.some(user => {
			if(user.login == process.env.GITHUB_USERNAME) {
				data.reviewId = user.id

				return true
			}
			return false
		})
	}
	
	fetch('https://github-fax.ngrok.io/create-pdf', {
		method: 'POST',
		body: JSON.stringify(data),
		headers: { 'Content-Type': 'application/json' }
	})

	res.sendStatus(200)
})

app.post('/create-pdf', (req, res) => {
	const url = req.body.url,
	matches = url.match(/https:\/\/api\.github\.com\/repos\/((\w|\d|-)+)\/((\w|\d|-|_)+)\/pulls\/((\d)+)/i),
			username = matches[1],
			repo = matches[3],
			pr = matches[5]

	const PDFDocument = require('pdfkit'),
	doc = new PDFDocument

	doc.pipe(fs.createWriteStream(`./files/pr_${repo}_${pr}.pdf`))

	doc.fontSize(40)

	doc.text('A new PR has been opened!')

	doc.fontSize(20)

	doc.text(`Check out the PR at ${url}`)

	doc.end()

	fetch('https://github-fax.ngrok.io/fax', {
		method: 'POST', 
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			fileName: `files/pr_${repo}_${pr}.pdf`
	})})

	res.end()
})

app.post('/pr/comment', (req, res) => {
	const {url, username, repo, pr, comment} = req.body

	fetch(`https://api.github.com/repos/${username}/${repo}/issues/${pr}/comments`, {
		method: 'POST',
		headers: { 
			'Content-Type': 'application/json',
			'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`
		},
		body: JSON.stringify({
			body: comment
		})
	})

	res.sendStatus(200)
})

app.post('/read', async (req, res) => {
	const cognitiveServiceCredentials = new CognitiveServicesCredentials(process.env.COMPUTER_VISION_KEY),
	client = new ComputerVisionClient(cognitiveServiceCredentials, process.env.COMPUTER_VISION_ENDPOINT)

	client.batchReadFile(req.body.url).then(result => {
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
			pr = matches[5],
			comment = string.split(url)[1]


			fetch('https://github-fax.ngrok.io/pr/comment', {
				method: 'POST',
				body: JSON.stringify({url, username, repo, pr, comment}),
				headers: { 'Content-Type': 'application/json' }
			})

		}).catch(err => console.log(err))
	}).catch(err => console.log(err))

	res.sendStatus(200)
})

app.listen(process.env.PORT || 3000, () => { 
	console.log(`Example app listening on port ${process.env.PORT || 3000}!`)
})
