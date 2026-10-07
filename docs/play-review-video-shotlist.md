# Play Console review video: shot list for Rob

Google asks for a short video of the app showing why it needs **background
location**. It is a real screen recording of the app on a real Android phone,
not the AI ad. Target 45-60 seconds, one continuous take if possible.
Upload to YouTube as **Unlisted** and paste the link into Play Console
(Policy > App content > Sensitive permissions > Location permissions).

## Before you start
- Install the build from Play (internal testing link) on a real Android phone.
- Fresh install, or clear the app's data, so the permission prompts appear.
- Start the phone's screen recorder (swipe down > Screen record). Turn the
  mic off unless you want to talk through it.
- Screen on, notifications allowed for the recorder.

## Shots (record in this order)
1. **Open the app for the first time** (3s). Show the home screen.
2. **Tap Start monitoring.** The in-app explanation appears first, the
   "prominent disclosure" saying the app uses background location to detect
   toll crossings even when closed. **Pause on it for ~4 seconds so it is
   readable**, then tap the button to continue.
3. **The Android location permission prompt** (5s). Choose "While using the
   app", then, on the follow-up/settings screen, **"Allow all the time"**.
   Show the settings screen where "Allow all the time" is ticked.
4. **Allow notifications** if asked.
5. **Back in the app, show monitoring is on** (3s): the "Monitoring" status.
6. **Press the Home button** so the app is closed/in the background, and
   lock the phone (5s). This shows it works when the app isn't open.
7. **Wake the phone, pull down the notification shade** and show the
   foreground "Toll Alert is monitoring" notification (3s).
8. **Trigger the alert.** Reopen the app, Home > **Simulate crossing
   (demo)**, then lock the phone and show the crossing alert arriving:
   "Dartford Crossing detected, TAP TO PAY" (5s).
9. **Tap the alert**, show it opens the official payment page, then go back
   and tap **Mark as paid** (8s).
10. **Show how to turn it off**: Settings in the app > stop monitoring
    (5s). Reviewers like seeing the user stays in control.

## Tips
- Don't show your real number plate, email or phone number.
- Keep the phone portrait and steady; no editing is needed.
- If a step looks different from what is described here, record what the app
  really does; Google wants the truth, not a script.

## Play Console steps for the test version (Rob)
1. Play Console > Toll Alert > **Testing > Internal testing**.
2. **Testers** tab > create an email list > add `ollehuntley123@gmail.com`
   (must be the Google account Olly uses on his Android phone) > Save.
3. **Releases** tab > Create new release > upload the AAB > Save > Review >
   **Start rollout to Internal testing**.
4. Back on the Testers tab, copy the **opt-in link** and send it to Olly.
   He opens it on his phone while signed in with that account, taps
   "Become a tester", then installs from Play. It can take a few minutes to
   a few hours to appear.
