// src/components/dashboard/TwitterIntegration.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Twitter, CheckCircle, AlertCircle, Loader2, Power } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { checkTwitterConnection, disconnectTwitter } from '@/app/actions/twitter-actions';
import { useToast } from '@/hooks/use-toast';

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  user?: TwitterUser;
  error?: string;
}

export default function TwitterIntegration({ dict }: { dict: any }) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const router = useRouter();

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const result = await checkTwitterConnection();
      setStatus(result);
      if (result.error && !result.isConnected) {
        toast({
            variant: "destructive",
            title: dict.connectionError,
            description: result.error,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : dict.unknownError;
      setStatus({ isConnected: false, error: errorMessage });
      toast({
          variant: "destructive",
          title: dict.connectionError,
          description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, dict]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const details = searchParams.get('details');

    if (success === 'twitter_connected') {
      toast({
        title: dict.connectSuccess,
        description: dict.connectSuccessDesc,
      });
      // After a successful connection, re-check the status to update the UI
      checkConnection();
      // Clean up the URL
      router.replace(window.location.pathname);
    } else if (error) {
      const errorMessage = decodeURIComponent(details || dict.connectFailDesc);
      toast({
        variant: 'destructive',
        title: dict.connectFail,
        description: errorMessage,
      });
       // Clean up the URL
      router.replace(window.location.pathname);
    }
    
    // Initial check on component mount if no params are present
    if (!success && !error) {
        checkConnection();
    }
  }, [searchParams, router, toast, checkConnection, dict]);


  const handleConnect = () => {
    setLoading(true);
    // Simply redirect to the auth endpoint. It handles the rest.
    window.location.href = '/api/twitter/auth';
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
        const result = await disconnectTwitter();
        if (result.success) {
            toast({ title: dict.disconnectSuccess });
            setStatus({ isConnected: false });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : dict.disconnectFailDesc;
      toast({
          variant: "destructive",
          title: dict.disconnectFail,
          description: errorMessage,
      });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Twitter className="h-5 w-5 text-primary" />
          {dict.title}
        </CardTitle>
        <CardDescription>
          {dict.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">{dict.checkingStatus}</span>
            </div>
        ) : status?.isConnected ? (
          <div className="space-y-3">
            <Alert variant="default" className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-foreground">
                {dict.connectedAs.replace('{user}', status.user?.username || 'user')}
              </AlertDescription>
            </Alert>
            <Button 
                onClick={handleDisconnect} 
                variant="destructive"
                className="w-full"
                disabled={loading}
              >
                <Power className="mr-2 h-4 w-4" />
                {dict.disconnect}
              </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {status?.error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{status.error}</AlertDescription>
                </Alert>
            )}
            <Button onClick={handleConnect} disabled={loading} className="w-full">
                <Twitter className="mr-2 h-4 w-4" />
                {dict.connect}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
