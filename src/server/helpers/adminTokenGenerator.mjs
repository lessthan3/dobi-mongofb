// readme: https://firebase.google.com/docs/database/rest/auth#google_oauth2_access_tokens
import { google } from 'googleapis';

const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/firebase.database',
];

export default class AdminTokenGenerator {
  constructor({ client_email: clientEmail, private_key: privateKey }) {
    this.expires = 0;
    this.accessToken = null;
    this.jwtClient = new google.auth.JWT(
      clientEmail,
      null,
      privateKey,
      scopes,
    );
  }

  async get() {
    // return current access token if it hasn't expired yet
    if ((Date.now() <= this.expires) && this.accessToken) {
      return this.accessToken;
    }

    const {
      access_token: accessToken,
      expiry_date: expires,
    } = await this.jwtClient.authorize();
    if (accessToken === null) {
      throw new Error('Provided service account does not have permission to generate access tokens');
    }


    // set this access token and expiration to be 10 seconds before it actually expires
    this.accessToken = accessToken;
    this.expires = expires - (1000 * 10);
    return accessToken;
  }
}
