# AI Digital Twin: Chrome Extension Specification

## Overview

The Chrome Extension component of the AI Digital Twin system is designed to capture user browsing behavior and interactions to provide personalized automation and insights. The extension operates in the background, collecting anonymized data about browsing habits while respecting user privacy and security.

## Features

### 1. Browsing Activity Tracking

- **Page Visits**: Capture URLs, page titles, and time spent on each page
- **Active Tabs**: Monitor which tabs are active vs. open but inactive
- **Browser Session**: Track start and end times of browsing sessions
- **Search Queries**: Capture search terms used in major search engines
- **Content Categories**: Classify visited websites into categories (e.g., work, education, entertainment)

### 2. User Interaction Capture

- **Scroll Patterns**: Measure scroll depth and reading patterns
- **Click Behavior**: Track link clicks and navigation patterns
- **Form Interactions**: Monitor form fills (without capturing sensitive data)
- **Productivity Metrics**: Track productive vs. non-productive browsing time
- **Focus/Distraction**: Identify frequently visited distracting sites

### 3. Data Management

- **Local Storage**: All raw data is initially stored locally
- **Anonymization**: PII (Personally Identifiable Information) is filtered out before any data leaves the browser
- **Secure Transmission**: Data sent to backend only via encrypted channels
- **User Control**: Ability to pause tracking, delete history, or opt out of specific tracking features
- **Retention Policy**: Clear data older than user-defined threshold

### 4. Analysis and Processing

- **Local Processing**: Preliminary analysis occurs in the browser for privacy
- **Aggregation**: Raw data points are aggregated into meaningful insights
- **Pattern Detection**: Identify browsing patterns and habits
- **Productivity Analysis**: Calculate productivity scores and identify time-wasting patterns

### 5. Integration with Backend

- **API Endpoints**: Send processed insights to AI Digital Twin backend
- **Authentication**: Use secure token-based auth to ensure data goes to correct user profile
- **Batched Uploads**: Collect data locally and upload in batches to minimize API calls
- **Offline Support**: Queue insights when offline for later transmission

## Technical Architecture

### Components

1. **Background Service Worker**
   - Manages extension lifecycle and persistent operations
   - Handles API communication with backend
   - Maintains local storage and queuing

2. **Content Scripts**
   - Inject into web pages to capture user interactions
   - Monitor DOM events and page content
   - Communicate with background service worker

3. **Popup Interface**
   - Provides user controls and settings
   - Displays basic insights and statistics
   - Allows pausing/resuming tracking

4. **Options Page**
   - Detailed settings configuration
   - Data management controls
   - Privacy preferences

### Data Schema

```json
{
  "browsing_session": {
    "session_id": "uuid",
    "start_time": "ISO timestamp",
    "end_time": "ISO timestamp",
    "total_duration_seconds": 0
  },
  "page_visits": [
    {
      "url": "anonymized_url",
      "title": "page_title",
      "start_time": "ISO timestamp",
      "end_time": "ISO timestamp",
      "duration_seconds": 0,
      "active_duration_seconds": 0,
      "scroll_depth_percent": 0,
      "interaction_count": 0,
      "category": "category_name"
    }
  ],
  "search_queries": [
    {
      "search_engine": "engine_name",
      "query": "search_term",
      "timestamp": "ISO timestamp"
    }
  ],
  "productivity_metrics": {
    "productive_time_seconds": 0,
    "distraction_time_seconds": 0,
    "most_productive_period": "timeframe",
    "common_distractions": ["site1", "site2"]
  }
}
```

## Privacy and Security Considerations

1. **No PII Collection**
   - No collection of passwords, form data, or personal details
   - URLs are scrubbed of query parameters that might contain PII
   - No tracking in incognito/private browsing mode

2. **User Transparency**
   - Clear onboarding explaining what data is collected
   - Regular reminders that tracking is active
   - Easy access to collected data and insights

3. **Data Minimization**
   - Only collect data necessary for providing insights
   - Local processing to minimize raw data transmission
   - Regular purging of unnecessary data

4. **Secure Storage**
   - Local data encrypted when possible
   - Use of secure browser storage APIs
   - No export of raw browsing data

## Implementation Timeline

### Phase 1: Core Tracking
- Basic page visit tracking
- Session duration monitoring
- Local storage implementation
- Simple popup UI

### Phase 2: Enhanced Interaction Tracking
- Scroll depth and interaction monitoring
- Category classification
- Productivity metrics

### Phase 3: Backend Integration
- API communication setup
- Batched uploads
- Authentication integration

### Phase 4: Advanced Analytics
- Pattern detection
- Productivity scoring
- Personalized insights

## API Integration

### Endpoints

- `POST /api/browser/insights` - Submit browser insights data
- `GET /api/browser/config` - Retrieve configuration for the extension
- `POST /api/browser/feedback` - Send user feedback on insights

### Authentication

- JWT token-based authentication
- Token renewal mechanism
- Secure storage of credentials

## Sample API Payload

```json
{
  "browser_id": "anonymous_id",
  "user_id": "authenticated_user_id",
  "timestamp": "ISO timestamp",
  "insights": {
    "productivity_score": 75,
    "top_categories": ["work", "education", "social-media"],
    "time_distribution": {
      "productive": 68,
      "neutral": 12,
      "distracting": 20
    },
    "most_visited": [
      {"domain": "example.com", "category": "work", "time_spent_minutes": 45},
      {"domain": "social-site.com", "category": "social-media", "time_spent_minutes": 15}
    ],
    "patterns": {
      "morning_focus": true,
      "afternoon_slump": true,
      "task_switching_frequency": "high"
    },
    "potential_tasks": [
      {"task": "Complete project on example.com", "priority": "high"},
      {"task": "Follow up on email from contact seen on social-site.com", "priority": "medium"}
    ]
  }
}
```

## User Settings Options

- **Tracking Level**: Basic, Detailed, or Comprehensive
- **Privacy Controls**: Website categories to exclude from tracking
- **Data Retention**: 7 days, 30 days, 90 days
- **Sync Frequency**: Real-time, Hourly, Daily
- **Notifications**: Enable/disable insight notifications
- **Focus Mode**: Block distracting sites during designated focus periods

## Integration with AI Digital Twin

The Chrome extension serves as a crucial data source for the AI Digital Twin, providing:

1. **Behavioral Insights**: Understanding when and how the user browses the web
2. **Interest Mapping**: Discovering topics and areas of interest based on browsing
3. **Productivity Analysis**: Identifying optimal work patterns and potential distractions
4. **Task Detection**: Discovering potential tasks from browsing behavior
5. **Learning Data**: Providing feedback loop for reinforcement learning of the digital twin

This data enables the AI Digital Twin to provide more personalized and contextually relevant assistance, helping users optimize their digital life and automate routine tasks. 