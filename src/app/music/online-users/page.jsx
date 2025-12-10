"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw, Clock, User } from "lucide-react";

export default function OnlineUsersPage() {
  const { data: session, status } = useSession();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchOnlineUsers = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (isInitialLoading) {
        // Keep initial loading state
      } else {
        // Silent refresh for auto-updates
      }

      const response = await fetch("/api/users/online?includeList=true");
      const data = await response.json();

      if (data.success) {
        setOnlineUsers(data.onlineUsers || []);
        setOnlineCount(data.onlineCount);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch online users:", error);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
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

  const getActivityStatus = (lastActive) => {
    const now = new Date();
    const active = new Date(lastActive);
    const diffInSeconds = Math.floor((now - active) / 1000);

    if (diffInSeconds < 30) return "active";
    if (diffInSeconds < 60) return "recent";
    return "idle";
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

  useEffect(() => {
    // Only fetch if we have a session
    if (status === "authenticated") {
      fetchOnlineUsers();

      // Auto-refresh every 10 seconds
      const interval = setInterval(fetchOnlineUsers, 10000);

      return () => clearInterval(interval);
    }
  }, [status]);

  // Show loading while session is being determined
  if (status === "loading") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-green-500" />
            Online Users
          </h1>
          <p className="text-muted-foreground">
            Users active within the last 2 minutes
          </p>
        </div>
        <Button
          onClick={() => fetchOnlineUsers(true)}
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
                  Every 10 seconds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          {isInitialLoading ? (
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
                const status = getActivityStatus(user.lastActive);
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
                  1 - 2 minutes ago
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
