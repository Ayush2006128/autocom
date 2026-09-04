# AutoCom

AutoCom is an Expo mobile app for fall detection, caregiver alerts, and SOS escalation.

## Why I built this

I am an SMA Type 3 patient, which means I depend on my parents for basic activities. When they need to go to work or buy groceries, they usually leave their phone with me in case I need something. Sometimes it slips out of my hands, leaving me with no way to contact them.

Because of that, one of my parents often has to stay with me. They cannot always do that, and I do not want to take away their freedom. So, with help from my AI friends, I built AutoCom: a way to alert my caregivers if my phone falls and I need help.

AutoCom is currently built for my personal use case. There are no customers or commercial users, so the source code is public. If you share a similar use case, you are welcome to clone the project, connect it to your own Firebase project, deploy the functions, and adapt it for yourself.

> **Important:** AutoCom is experimental and should not be treated as a guaranteed safety device or a replacement for appropriate care or emergency services. Fall detection is personal and needs to be tested and tuned for each person.

## Set up your own instance

You will need:

- Node.js
- A Firebase project on the **Blaze plan** (Cloud Functions require billing)
- Firebase Authentication and Firestore enabled
- An Expo account and the EAS CLI
- An Android development or production build

1. Clone the repository and install the app dependencies:

   ```bash
   git clone https://github.com/Ayush2006128/autocom.git
   cd autocom
   npm install
   ```

2. Create or select your Firebase project. Enable the sign-in method used by the app in Firebase Authentication, create a Firestore database, and add an Android app to the Firebase project.

3. Download your Firebase Android configuration file as `google-services.json` and place it in the repository root. Update the Firebase web configuration in `src/firebaseConfig.ts` with the values from your own Firebase app.

4. Install the Cloud Functions dependencies and deploy them:

   ```bash
   cd functions
   npm install
   cd ..
   npx firebase login
   npx firebase use YOUR_FIREBASE_PROJECT_ID
   npx firebase deploy --only functions
   ```

5. Build the app with EAS. Expo Go does not include AutoCom's custom native foreground-service module, so it cannot be used for Android fall monitoring:

   ```bash
   npm install --global eas-cli
   eas login
   eas build --platform android --profile preview
   ```

   For a store or production build, use `eas build --platform android --profile production`.

The app uses Firebase to store users and alerts. After registration, a patient receives a six-character patient code; a caregiver can use that code to link their account and receive push notifications.

## Development

For UI and other JavaScript work, you can start the development server with:

```bash
npm install
npx expo start
```

Remember that fall monitoring itself requires an EAS development or production build with the native module included.

## Updates

This project is updated from time to time. When a new version is released, update your fork and rebuild the app. Keep your Firebase configuration and project credentials private.

## Help and discussions

If you need help building AutoCom or setting up your Firebase and EAS projects, open a GitHub Discussion.

## Contributing

Contributions are welcome, especially from people who are physically impaired, caregivers, or people building this for loved ones with similar needs. Real-world experience matters here: the physics of falling, slipping, and sliding is different for every person.

For that reason, please **do not modify the existing fall-detection logic unless you have direct, relevant experience** with the person and use case it serves. An apparently better change can make detection worse for someone else. If you do not have that experience, please open a discussion first and describe the change you would like to make.

Contributions to the UI, caregiver experience, infrastructure, or additional alerting services are welcome. Suggestions for new ways to alert caregivers are also encouraged. Please preserve the existing fall-detection behavior unless a change has been discussed with the people who rely on it.

> **Warning:** This project was built for one person's needs and is still experimental. Review, test, and harden it thoroughly before relying on it for any safety-critical situation.
