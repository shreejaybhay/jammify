"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw, Clock, User, Shield, AlertTriangle, BarChart3 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import DailyUsersChart from "@/components/analytics/DailyUsersChart";
import UserActivityTracker from "@/components/analytics/UserActivityTracker";

export default function OnlineUsersPage() {
  const { data: session, status } = useSession();
  const { isAdmin, isLoading: adminLoading, error: adminError } = useAdminAccess();
  const { onlineCount, onlineUsers, isLoading, refreshOnlineUsers } =
    useOnlineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Prevent unnecessary re-checks by memoizing admin status
  const adminStatusChecked = useRef(false);
  const currentUserEmail = useRef(null);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    await refreshOnlineUsers();
    setIsRefreshing(false);
  };

  const formatLastActive = (lastActive) => {
    const now = new Date();
    const active = new Date(lastActive);
    const diffInSeconds = Math.floor((now - active) / 1000);

    if (diffInSeconds < 30) {
      return "Just now";
    } else if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 120) {
      return "1m ago";
    } else {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    }
  };

  const getActivityStatus = (user) => {
    // Use server-provided status if available, otherwise calculate
    if (user.status) {
      return user.status;
    }
    
    const now = new Date();
    const active = new Date(user.lastActive);
    const diffInSeconds = Math.floor((now - active) / 1000);

    if (diffInSeconds < 30) return "active";
    if (diffInSeconds < 60) return "recent";
    if (diffInSeconds < 240) return "idle"; // Extended to 4 minutes
    return "offline";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "recent":
        return "bg-yellow-500";
      case "idle":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "active":
        return "default";
      case "recent":
        return "secondary";
      case "idle":
        return "outline";
      default:
        return "outline";
    }
  };

  // Update lastUpdated when onlineUsers changes
  useEffect(() => {
    if (onlineUsers.length > 0 || onlineCount >= 0) {
      setLastUpdated(new Date());
    }
  }, [onlineUsers, onlineCount]);

  // Prevent unnecessary admin re-checks on tab switches
  useEffect(() => {
    if (session?.user?.email && currentUserEmail.current !== session.user.email) {
      currentUserEmail.current = session.user.email;
      adminStatusChecked.current = false;
    }
    
    if (isAdmin && !adminLoading && !adminStatusChecked.current) {
      adminStatusChecked.current = true;
    }
  }, [session?.user?.email, isAdmin, adminLoading]);

  // Show loading while session is being determined
  if (status === "loading" || adminLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              {status === "loading" ? "Loading..." : "Checking permissions..."}
            </span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show sign in message only after we're sure there's no session
  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              Please sign in to view online users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show admin access required message
  if (status === "authenticated" && !adminLoading && !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Admin Access Required</h2>
              <p className="text-muted-foreground max-w-md">
                This page is restricted to administrators only. You need admin privileges to view online users.
              </p>
              {adminError && (
                <div className="flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{adminError}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Signed in as: {session?.user?.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Track user activity for analytics */}
      <UserActivityTracker />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-green-500" />
            Online Users
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <Shield className="h-3 w-3 mr-1" />
              Admin View
            </Badge>
          </h1>
          <p className="text-muted-foreground">
            Users active within the last 4 minutes
          </p>
        </div>
        <Button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              <div>
                <p className="text-2xl font-bold">{onlineCount}</p>
                <p className="text-sm text-muted-foreground">Users Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--"}
                </p>
                <p className="text-sm text-muted-foreground">Last Updated</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Auto-refresh</p>
                <p className="text-sm text-muted-foreground">
                  Every 8 seconds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Active Users Analytics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Daily Active Users Analytics</h2>
          <Badge variant="outline" className="text-xs">
            Admin Only
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 30-day overview */}
          <DailyUsersChart 
            days={30}
            chartType="area"
            showSummary={true}
            autoRefresh={false}
          />
          
          {/* 7-day detailed view */}
          <DailyUsersChart 
            days={7}
            chartType="line"
            showSummary={false}
          />
        </div>
      </div>

      {/* Online Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Users ({onlineUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading users...
              </span>
            </div>
          ) : onlineUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No users online
              </p>
              <p className="text-sm text-muted-foreground">
                Be the first to start using the app!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onlineUsers.map((user) => {
                const status = getActivityStatus(user);
                const isCurrentUser = user.email === session?.user?.email;

                return (
                  <div
                    key={user._id}
                    className={`relative p-4 rounded-lg border transition-all hover:shadow-md ${
                      isCurrentUser
                        ? "bg-primary/5 border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {isCurrentUser && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 text-xs"
                      >
                        You
                      </Badge>
                    )}

                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.image} alt={user.name} />
                          <AvatarFallback>
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${getStatusColor(
                            status
                          )}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getStatusBadgeVariant(status)}
                            className="text-xs"
                          >
                            {status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatLastActive(user.lastActive)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-500 rounded-full" />
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">Last 30 seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-yellow-500 rounded-full" />
              <div>
                <p className="font-medium">Recent</p>
                <p className="text-sm text-muted-foreground">
                  30s - 1 minute ago
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-orange-500 rounded-full" />
              <div>
                <p className="font-medium">Idle</p>
                <p className="text-sm text-muted-foreground">
                  1 - 4 minutes ago
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
