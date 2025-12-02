# Updating Extension on Web Stores (v1.0.1)

## Quick Update Guide

Your fixed packages are ready in `extension/dist/`:
- `chrome.zip` - for Chrome Web Store
- `firefox.zip` - for Firefox Add-ons

---

## Chrome Web Store Update

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Find your **citavErs Web Clipper** listing
3. Click on it to edit
4. Click **"Package"** tab or **"Upload New Package"**
5. Upload the new `chrome.zip`
6. Add version notes: "Fixed login functionality - resolved null reference error"
7. Click **"Submit for Review"**

**Review time**: Usually 1-3 business days, but updates are often faster than initial submissions.

---

## Firefox Add-ons Update

1. Go to [Firefox Developer Hub](https://addons.mozilla.org/developers/)
2. Click on **"My Add-ons"**
3. Select **citavErs Web Clipper**
4. Click **"Upload New Version"**
5. Upload `firefox.zip`
6. Add version notes: "Fixed login functionality - resolved null reference error in popup.js"
7. Click **"Submit Version"**

**Review time**: 1-5 business days (Firefox reviews are typically more thorough)

---

## What Changed in v1.0.1

- Fixed critical bug where login screen wouldn't load due to null reference error
- Removed references to non-existent `settings-view` element
- Improved error handling for network requests
- Added better console logging for debugging

---

## Post-Update

Once approved, the fixed version will automatically roll out to existing users. They'll see:
- Chrome: Auto-updates within hours
- Firefox: Auto-updates within 24 hours

You can monitor the rollout status in each store's dashboard.
