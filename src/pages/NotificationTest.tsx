import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Check, X, Clock, TestTube } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotificationTest() {
  const {
    isSupported,
    isEnabled,
    permission,
    enableNotifications,
    sendTestNotification,
    scheduleReminder,
    scheduleEngagement,
  } = usePushNotifications();

  const handleScheduleReminder = () => {
    const futureTime = new Date(Date.now() + 10000); // 10 seconds from now
    scheduleReminder('test-session-123', 'Test Session', futureTime);
  };

  const handleScheduleEngagement = () => {
    // Schedule for 10 seconds instead of 30 minutes for testing
    scheduleEngagement(10 / 60); // Convert 10 seconds to minutes
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-primary hover:underline text-sm">
          ← Back to Home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Push Notification E2E Test
            </CardTitle>
            <CardDescription>
              Comprehensive test of all push notification features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Section */}
            <div className="space-y-3">
              <h3 className="font-semibold">Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm">Browser Support</span>
                  <Badge variant={isSupported ? 'default' : 'destructive'}>
                    {isSupported ? (
                      <><Check className="h-3 w-3 mr-1" /> Supported</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" /> Not Supported</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm">Permission</span>
                  <Badge 
                    variant={
                      permission === 'granted' ? 'default' : 
                      permission === 'denied' ? 'destructive' : 
                      'secondary'
                    }
                  >
                    {permission}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm">Notifications</span>
                  <Badge variant={isEnabled ? 'default' : 'secondary'}>
                    {isEnabled ? (
                      <><Bell className="h-3 w-3 mr-1" /> Enabled</>
                    ) : (
                      <><BellOff className="h-3 w-3 mr-1" /> Disabled</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Test Actions */}
            <div className="space-y-3">
              <h3 className="font-semibold">Test Actions</h3>
              <div className="grid gap-3">
                <Button 
                  onClick={enableNotifications} 
                  disabled={isEnabled}
                  className="w-full justify-start"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isEnabled ? 'Notifications Already Enabled' : 'Enable Notifications'}
                </Button>

                <Button 
                  onClick={sendTestNotification}
                  disabled={!isEnabled}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test Notification (Immediate)
                </Button>

                <Button 
                  onClick={handleScheduleReminder}
                  disabled={!isEnabled}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Session Reminder (10s)
                </Button>

                <Button 
                  onClick={handleScheduleEngagement}
                  disabled={!isEnabled}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Engagement Reminder (10s)
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
              <p className="font-medium">Test Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Click "Enable Notifications" and accept the browser prompt</li>
                <li>A confirmation notification will appear in 5 seconds</li>
                <li>Test immediate notifications with "Send Test Notification"</li>
                <li>Test scheduled reminders (appear after 10 seconds)</li>
                <li>Test engagement reminders (appear after 10 seconds)</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
