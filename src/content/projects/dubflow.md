---
title: dubflow
oneLiner: a context-aware desktop focus companion
kind: Desktop app
status: hackathon
created: 2026-01-15 # approximate
stack:
  - SvelteKit
  - Electron
  - OpenCV
  - AWS Rekognition
  - Bedrock
  - ElevenLabs
thumb: ../../assets/projects/dubflow-1.jpg
images:
  - ../../assets/projects/dubflow-1.jpg
  - ../../assets/projects/dubflow-2.png
  - ../../assets/projects/dubflow-3.png
---

Built for DubHacks. Shoutout Berkan, Yifan and Ben

DubFlow is a smart focus tracker that keeps you accountable in the cutest way possible. It's a desktop app/overlay that uses both webcam video and window monitoring to recognize when you're focused or distracted. Your on-screen companion, Dubs (the UW mascot), reacts in real time to your behavior. DubFlow has a main dashboard that allows users to start new focus sessions, view focus analytics, control Dubs, and view past session history. Once a focus session is started, the Dubs overlay appears and begins monitoring your focus in real-time.

There are two ways to trigger a distracted state: looking away from the screen or switching to a distracting app/website. Dubs will then respond with a context-aware message like: "Only 20 minutes remain for those integrals, so put that phone away before I eat it." The session is visualized on the progress bar, with yellow segments indicating distracted periods and purple segments indicating focused periods.

DubFlow is built with SvelteKit and Electron. The architecture combines multiple data sources to create a complete picture of your focus state.

The vision processing component uses OpenCV locally for real-time eye tracking and AWS Rekognition for detailed context analysis. Rekognition detects distracting objects in the frame such as phones, drinks, or other devices. For window monitoring, we use get-windows to track active applications and websites.

All this context is piped to an AWS Bedrock-hosted LLM, which generates relevant and concise messages that keep you focused. The messages are displayed on-screen, spoken aloud through ElevenLabs, and sent to the user's phone via Pushover notifications.
