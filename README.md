# Dismissal Manager

A web-based school dismissal management system designed to improve communication, visibility, and efficiency during student pickup.

## Features

### Car Entry
- Add dismissal tags from a phone or computer
- Supports single and multiple-tag entries
- Duplicate warning with confirmation
- Edit and delete entries
- Realtime synchronization through Firebase

### Dismissal Board
- Large-format display for cafeteria SmartBoards
- Configurable number of displayed tags
- Realtime updates
- Student-needed alerts move to the top automatically
- Consistent board layout with reserved display positions

### Release Student
- Spot-based dismissal matrix
- Realtime synchronization
- Release status tracking
- Tap to release students
- Accidental releases can be undone

### Spot Manager
- View live dismissal spots and future waves
- Send student-needed alerts
- Alert status displayed across all devices
- Alerts can be toggled on and off

### Settings
- School Name
- Starting Spot
- Ending Spot
- Cars Displayed
- Shared settings across all devices through Firebase

### History
- Automatic dismissal history tracking
- Stores:
  - Date
  - Start Time
  - End Time
  - Duration
  - Cars Released
  - Cars Per Minute
- Delete historical records

## Technology

- HTML
- CSS
- JavaScript
- Firebase Firestore
- GitHub Pages
- Font Awesome

## Realtime Synchronization

All operational screens share the same cloud data source:

- Car Entry
- Dismissal Board
- Release Student
- Spot Manager

Changes made on one device automatically appear on all connected devices.

## Purpose

Dismissal Manager was created to reduce radio traffic, improve student pickup efficiency, increase staff visibility into dismissal operations, and provide a simple web-based solution that works on phones, tablets, laptops, and SmartBoards without requiring app installation.