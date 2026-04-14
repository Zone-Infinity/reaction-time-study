# Reaction Time Study – Statistical Inference Project

This is a simple web-based reaction time experiment built as part of an academic project for the **Statistical Inference** course at **IIT Kharagpur**.

The application measures human reaction time across **three trials** and collects anonymized data for statistical analysis.

> **Note:** This project was developed using AI-assisted ("vibe coding") techniques under time constraints for academic purposes.

## Features

- 3-trial reaction time test
- Automatic trial progression
- Early-click detection
- Average reaction time calculation
- Anonymous data collection
- Clean minimal UI

## Tech stack

- SvelteKit (frontend + server)
- SheetDB (data storage)
- Vercel (deployment)

## How it works

1. User clicks to start
2. Waits for green signal
3. Clicks as fast as possible
4. Repeats for 3 trials
5. Data is submitted anonymously

## Run locally

```sh
npm install
npm run dev
```

## Env

Create `.env`:

```sh
SHEETDB_URL=your_sheetdb_api_url
```

## Disclaimer

This project is for educational purposes only. No personal data is collected.
