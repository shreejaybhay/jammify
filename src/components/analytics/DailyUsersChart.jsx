"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Users, 
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';

export default function DailyUsersChart({ 
  days = 30, 
  chartType = 'area', // 'line' or 'area'
  showSummary = true,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDays, setSelectedDays] = useState(days);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setRefreshing(true);
      
      const response = await fetch(`/api/analytics/daily-users?days=${selectedDays}&format=chart`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching daily users data:', err);
    } finally {
      setLoading(false);
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDays]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData(true);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, selectedDays]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleDaysChange = (newDays) => {
    setSelectedDays(newDays);
    setLoading(true);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-20 w-32" />
              <Skeleton className="h-20 w-32" />
              <Skeleton className="h-20 w-32" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Analytics</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { chartData, summary } = data;

  const getTrendIcon = () => {
    switch (summary.trendDirection) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (summary.trendDirection) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{payload[0].value}</span> active users
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Daily Active Users
            </CardTitle>
            <CardDescription>
              Track unique users who opened your app each day
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Time period selector */}
        <div className="flex gap-2 mt-4">
          {[7, 14, 30, 60, 90].map((dayOption) => (
            <Button
              key={dayOption}
              variant={selectedDays === dayOption ? "default" : "outline"}
              size="sm"
              onClick={() => handleDaysChange(dayOption)}
            >
              {dayOption}d
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary Stats */}
        {showSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                Total Users
              </div>
              <div className="text-2xl font-bold">{summary.totalUsers.toLocaleString()}</div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                Daily Average
              </div>
              <div className="text-2xl font-bold">{summary.averageUsers}</div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                Peak Day
              </div>
              <div className="text-2xl font-bold">{summary.maxUsers}</div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                {getTrendIcon()}
                7-Day Trend
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{summary.last7DaysAverage}</span>
                <Badge variant="outline" className={getTrendColor()}>
                  {summary.trendPercentage > 0 ? '+' : ''}{summary.trendPercentage}%
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="formattedDate" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="formattedDate" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Chart info */}
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>Showing last {selectedDays} days</span>
          <span>Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}