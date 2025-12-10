'use client';

import { useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Users, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function OnlineUsersIndicator({ showUsersList = false }) {
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const { onlineCount, onlineUsers, isLoading, refreshOnlineUsers } = useOnlineStatus();
  const [showUsers, setShowUsers] = useState(false);

  // Only show for admin users
  if (!isAdmin || adminLoading) {
    return null;
  }

  const handleShowUsers = () => {
    if (!showUsers) {
      refreshOnlineUsers();
    }
    setShowUsers(!showUsers);
  };

  const formatLastActive = (lastActive) => {
    const now = new Date();
    const active = new Date(lastActive);
    const diffInSeconds = Math.floor((now - active) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 120) {
      return '1 minute ago';
    } else {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-sm">
        <div className="relative">
          <Users className="h-4 w-4 text-green-500" />
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        </div>
        <span className="text-muted-foreground">
          {onlineCount} online
        </span>
      </div>

      {showUsersList && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowUsers}
              className="h-6 w-6 p-0"
            >
              {showUsers ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Online Users ({onlineCount})</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshOnlineUsers}
                  className="h-6 px-2 text-xs"
                >
                  Refresh
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {onlineUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users currently online
                  </p>
                ) : (
                  onlineUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatLastActive(user.lastActive)}
                        </p>
                      </div>
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}