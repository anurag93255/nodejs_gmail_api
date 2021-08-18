const nodemailer = require('nodemailer');
const {OAuth2Client} = require('google-auth-library');
const express = require("express")
const keys = require('./credentials.json');
const app = express();
const fs = require('fs');
const { resolve } = require('path');


const oAuth2Client = new OAuth2Client(
    keys.web.client_id,
    keys.web.client_secret,
    keys.web.redirect_uris[0]
);

// Deining gmail scope and token file
const SCOPES = ['https://mail.google.com/'];
const TOKEN_PATH = 'token.json';


// To check server running or not
app.get('/', (req, res) => {
    res.send("Server Running Successfully")
})

/**
 * This will generate gmail API credential
 */
app.get('/generate_credential', (req, res) => {
    
    let promise = new Promise((resolve, reject) => {
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        });
        resolve(authorizeUrl);
    }).then(
        (resolve) => {
            res.redirect(resolve);
        },
        (reject) => {
            res.send('Something went wrong')
        }
    );
    
})

/* 
    This will store user accessToken and other things in a file
    after granting permission in consent screen 
*/
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code
    const scope = req.query.scope

    const token = await oAuth2Client.getToken(code);
    
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
    });
    
    res.send('Token stored to ' + TOKEN_PATH);
})

// Function to send mail using nodemailer
async function send_mail(req) {
    try {
        const req_from      = req.from;
        const req_to        = req.to;
        const req_subject   = req.subject;
        const req_text      = req.text;
        const req_html      = req.html;

        // This is test data
        // const req_from      = ' NAME <EMAIL_ID@gmail.com>';
        // const req_to        = "TO_EMAIL_ID@gmail.com";
        // const req_subject   = "SUBJECT";
        // const req_text      = "BODY_TEXT";
        // const req_html      = "BODY_HTMl";


        var transport, mailOptions;

        mailOptions = {
            from: req_from,
            to: req_to,
            subject: req_subject,
            text: req_text,
            html: req_html
        };


        // reading stored token file of user
        return fs.readFile(TOKEN_PATH, (err, token) => {
            if(err) {
                // redirect to "/generate_credential" to generate accessToken
            }
            const creds = JSON.parse(token);

            // Creating Nodemailer Transport with default configuration
            transport = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: 'forvideoview000@gmail.com',
                    clientId: keys.web.client_id,
                    clientSecret: keys.web.client_secret,
                    refreshToken: creds.tokens.refresh_token,
                    accessToken: creds.tokens.access_token
                }
            });

            // transport = nodemailer.createTransport({
            //     host: 'smtp.gmail.com',
            //     port: 465,
            //     secure: true,
            //     auth: {
            //         type: 'OAuth2',
            //         user: 'forvideoview000@gmail.com',
            //         accessToken: 'ya29.a0ARrdaM9QjjwacIu_sSkq5awo0MlGyVCk5F-LbJtGpIUt0FUJpAJ-xNq5lsuBVb5hi8D8r-TOP5og_XH3fPXy8whZM0iZrMnYsHN3zzFx6Okqkah7G-JuJcMXITT2Oy1aVRZrJbVg2DAydmq_t_odtqVAf2vn'
            //     }
            // });

            // Send Mail
            return transport.sendMail(mailOptions);
            
        });
        
    } catch(err) {
        return err;
    }
    
}


// This will call send_mail function
app.post('/send_mail', (req, res) => {
    
    send_mail(req.body)
        .then((result) => {
            console.log('Email sending....', result);
        }).catch(err => {
            console.log(err.message);
        });
    res.send('Mail sent');
    
})

app.listen(9000);