# 📊 Daily Active Users Analytics - Integration Guide

This system tracks unique users per day and displays beautiful analytics charts using ShadCN UI + Recharts.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install recharts
```

### 2. Add User Activity Tracking to Your Pages

#### Option A: Automatic Tracking (Recommended)
Add the tracker component to your main layout or specific pages:

```jsx
// In your layout.js or any page
import UserActivityTracker from '@/components/analytics/UserActivityTracker';

export default function Layout({ children }) {
  return (
    <div>
      <UserActivityTracker />
      {children}
    </div>
  );
}
```

#### Option B: Manual Tracking
Use the hook directly for more control:

```jsx
// In any component
import { useUserActivity } from '@/hooks/useUserActivity';

export default function MyPage() {
  const { recordActivity } = useUserActivity();
  
  // Automatically tracks on mount, focus, and visibility change
  // Or call recordActivity() manually when needed
  
  return <div>Your content</div>;
}
```

### 3. View Analytics
Navigate to `/analytics` to see your daily active users dashboard.

## 📁 Files Created

### Backend (API Routes)
- `src/models/DailyActiveUser.js` - MongoDB schema for tracking daily users
- `src/app/api/analytics/record-activity/route.js` - API to record user activity
- `src/app/api/analytics/daily-users/route.js` - API to fetch daily user stats

### Frontend (Components)
- `src/components/analytics/DailyUsersChart.jsx` - Main chart component
- `src/components/analytics/UserActivityTracker.jsx` - Simple tracking component
- `src/hooks/useUserActivity.js` - React hook for activity tracking
- `src/app/analytics/page.jsx` - Analytics dashboard page

## 🔧 Configuration Options

### DailyUsersChart Props
```jsx
<DailyUsersChart 
  days={30}                    // Number of days to show (7, 14, 30, 60, 90)
  chartType="area"             // "area" or "line"
  showSummary={true}           // Show summary statistics
  autoRefresh={false}          // Auto-refresh data
  refreshInterval={300000}     // Refresh interval in ms (5 minutes)
/>
```

### useUserActivity Options
```jsx
const { recordActivity } = useUserActivity({
  enabled: true,                    // Enable/disable tracking
  recordOnMount: true,              // Record when component mounts
  recordOnFocus: true,              // Record when window gains focus
  recordOnVisibilityChange: true,   // Record when tab becomes visible
  debounceMs: 5000                  // Minimum time between recordings
});
```

## 📊 API Endpoints

### Record User Activity
```
POST /api/analytics/record-activity
```
Automatically called by the tracking components. Records the current authenticated user's activity for today.

### Get Daily User Stats
```
GET /api/analytics/daily-users?days=30&format=chart
```
Returns daily active user counts with summary statistics.

Query Parameters:
- `days` (optional): Number of days to fetch (default: 30)
- `format` (optional): "chart" or "table" (default: "chart")

## 🎯 Features

### Automatic Deduplication
- Each user is counted only once per day
- Multiple visits on the same day don't increase the count
- Uses email as the unique identifier

### Smart Caching
- API responses are cached for 5 minutes
- Reduces database load while maintaining accuracy
- Cache automatically invalidates on new data

### Performance Optimized
- Debounced activity recording (max once per 5 seconds)
- Efficient MongoDB queries with proper indexing
- Minimal data storage (only email, name, timestamp)

### Beautiful UI
- Responsive charts that work on all devices
- Dark/light theme support
- Interactive tooltips and hover effects
- Summary statistics with trend analysis

## 🔒 Security & Privacy

### Authentication Required
- Only authenticated users are tracked
- Uses NextAuth session validation
- No tracking for anonymous users

### Minimal Data Collection
- Only stores: email, name (optional), timestamp
- No sensitive personal information
- Data is aggregated for analytics

### GDPR Compliant
- Users can be removed from analytics
- Data is used only for app improvement
- No third-party data sharing

## 📈 Dashboard Features

### Multiple Time Periods
- 7, 14, 30, 60, and 90-day views
- Easy switching between time periods
- Automatic date filling for missing days

### Summary Statistics
- Total users across selected period
- Daily average users
- Peak day performance
- 7-day trend analysis with percentage change

### Visual Options
- Area charts for trend visualization
- Line charts for detailed analysis
- Responsive design for all screen sizes
- Real-time data updates

## 🛠️ Customization

### Adding to Existing Pages
Simply add the tracker component to any page:

```jsx
// In your existing pages
import UserActivityTracker from '@/components/analytics/UserActivityTracker';

export default function MusicPage() {
  return (
    <div>
      <UserActivityTracker />
      {/* Your existing content */}
    </div>
  );
}
```

### Custom Chart Styling
The chart uses CSS variables from your theme:

```css
/* Customize chart colors */
:root {
  --primary: 210 40% 98%;  /* Chart line/area color */
  --muted: 210 40% 96%;    /* Grid lines */
  --background: 0 0% 100%; /* Chart background */
}
```

### Database Indexes
The system automatically creates these MongoDB indexes for optimal performance:
- `{ date: 1 }` - For date-based queries
- `{ date: 1, 'users.email': 1 }` - For duplicate checking

## 🚨 Troubleshooting

### Common Issues

1. **Charts not loading**
   - Check if user is authenticated
   - Verify MongoDB connection
   - Check browser console for errors

2. **No data showing**
   - Ensure UserActivityTracker is added to pages
   - Check if users are visiting the app
   - Verify API endpoints are working

3. **Performance issues**
   - Increase cache TTL in API routes
   - Reduce auto-refresh frequency
   - Limit the number of days displayed

### Debug Mode
In development, the system logs activity recording:
```
📊 User activity recorded (mount): { success: true, isNew: true }
```

## 🎉 You're All Set!

Your daily active users tracking system is now ready! The system will:

1. ✅ Automatically track authenticated users
2. ✅ Store unique daily counts in MongoDB
3. ✅ Display beautiful analytics charts
4. ✅ Provide trend analysis and insights
5. ✅ Handle caching and performance optimization

Visit `/analytics` to see your dashboard in action!