# GitHub Fax PR Reviews
And integration to allow reviewing and commenting on pull requests via fax.

## To Use
- Download repository
- Run `npm install` or `yarn install`
- Run `cp .env.example .env` to create new `.env` file
- Fill in env variables in `.env` file from your Twilio account
- Use `npm start` to run locally
- Use [ngrok](https://ngrok.com) to expose the page
- In your [Twilio Console](https://www.twilio.com/console/phone-numbers), edit the fax capable number you're using to send
  - Change it to **Accept Incoming Faxes** (will likely be Voice Calls by default)
  - Change the **A Fax comes in ** webhook to be your ngrok url for the `/sent` function, eg. `https://92832d0.ngrok.io/sent`
- In the settings for your GitHub repository (`https://github.com/{username}/{/settings`), under **Webhooks**, create a new webhook with the `/pr/open` function (eg. `https://92832d0.ngrok.io/pr/open`) to be triggered on the Pull requests event


## Env Variables
`TWILIO_ACCOUNT_SID` - Account SID, found in [Twilio Console on Dashboard](https://www.twilio.com/console)
`TWILIO_AUTH_TOKEN` - Account Auth Token, found in [Twilio Console on Dashboard](https://www.twilio.com/console)
`GITHUB_ACCESS_TOKEN` - Personal Access Token for project, generated in [GitHub Developer Settings](https://github.com/settings/tokens) (make sure it has repository access)
`GITHUB_USERNAME` - Your GitHub Username
`COMPUTER_VISION_ENDPOINT` - The endpoint for your Computer Vision resource in Azure, should look like `{region}.api.cognitive.microsoft.com` where region is the location of your service (list of regions in the [Computer Vision API documentation](https://westus.dev.cognitive.microsoft.com/docs/services/5cd27ec07268f6c679a3e641/operations/2afb498089f74080d7e196fc))
`COMPUTER_VISION_KEY` - The API key for your Computer Vision resource in Azure, found in the Azure portal under the **Keys and Endpoint** section
`SEND_NUMBER` - The fax capable Twilio number you're sending the fax from
`RECEIVE_NUMBER` - The fax number you're sending a fax to