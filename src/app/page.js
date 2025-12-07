"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Home() {
  // PWA Installation states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(true); // Always show for testing

  // PWA Installation functionality
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    // Check if app is already installed - commented out for testing
    // if (window.matchMedia('(display-mode: standalone)').matches) {
    //   setShowInstallButton(false);
    // }
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Native PWA installation available
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallButton(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for desktop browsers - show manual instructions
      showManualInstallInstructions();
    }
  };

  const [showInstructions, setShowInstructions] = useState(false);

  const showManualInstallInstructions = () => {
    setShowInstructions(true);
  };

  const getInstallInstructions = () => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    if (isChrome) {
      return {
        title: "Install on Chrome",
        steps: [
          "Look for the install icon (⬇️) in your browser's address bar",
          "Or click the three dots menu → 'Install Jammify...'",
          "Click 'Install' to add Jammify to your desktop"
        ]
      };
    } else if (isEdge) {
      return {
        title: "Install on Edge", 
        steps: [
          "Look for the install icon (⬇️) in your browser's address bar",
          "Or click the three dots menu → 'Apps' → 'Install this site as an app'",
          "Click 'Install' to add Jammify to your desktop"
        ]
      };
    } else {
      return {
        title: "Install Instructions",
        steps: [
          "Use Chrome or Edge browser for the best experience",
          "Visit this site in Chrome/Edge",
          "Look for the install option in the address bar or browser menu"
        ]
      };
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
          <div className="text-base sm:text-lg md:text-xl font-medium text-black dark:text-white">
            MusicApp
          </div>
          <div className="flex items-center gap-3">
            {/* Install App Button */}
            {showInstallButton && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Install App</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                      </div>
                      <div>
                        <div className="font-semibold">Jammify — Stream Music with Style</div>
                        <div className="text-sm text-muted-foreground font-normal">jammify-music.vercel.app</div>
                      </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Install Jammify as an app on your device for a better experience. You'll be able to access it directly from your home screen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700">
                      Install
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex min-h-screen items-center justify-center px-6 sm:px-8 md:px-12 lg:px-16">
        <div className="text-center w-full max-w-4xl mx-auto">

          {/* Hero Text */}
          <div className="mb-8 sm:mb-12 md:mb-16">
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light text-black dark:text-white tracking-tight leading-[1.1] mb-6 sm:mb-8">
              Listen to music
              <br />
              <span className="font-normal">like never before</span>
            </h1>

            <p className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto font-light leading-relaxed">
              Stream millions of songs with exceptional quality.
              Discover new artists, create playlists, and enjoy your music anywhere.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mb-12 sm:mb-16 md:mb-20 space-y-4">
            <Link
              href="/music"
              className="group inline-flex items-center justify-center px-8 sm:px-10 md:px-12 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-medium text-white bg-black dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 ease-out min-w-[200px] w-full max-w-sm sm:w-auto"
            >
              Get Started
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            
            {/* Install App Button - Main CTA */}
            <div className="flex justify-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2 px-6 py-2">
                    <Download className="w-4 h-4" />
                    Install as App
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                      </div>
                      <div>
                        <div className="font-semibold">Jammify — Stream Music with Style</div>
                        <div className="text-sm text-muted-foreground font-normal">jammify-music.vercel.app</div>
                      </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Install Jammify as an app on your device for a better experience. You'll be able to access it directly from your home screen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700">
                      Install
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Simple Features */}
          <div className="grid grid-cols-1 gap-8 sm:gap-6 md:gap-8 lg:gap-12 max-w-sm sm:max-w-none sm:grid-cols-3 mx-auto">
            <div className="text-center">
              <div className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-black dark:text-white mb-2 sm:mb-3">50M+</div>
              <p className="text-xs xs:text-sm sm:text-base text-gray-600 dark:text-gray-400 font-light">Songs available</p>
            </div>

            <div className="text-center">
              <div className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-black dark:text-white mb-2 sm:mb-3">320kbps</div>
              <p className="text-xs xs:text-sm sm:text-base text-gray-600 dark:text-gray-400 font-light">High quality audio</p>
            </div>

            <div className="text-center">
              <div className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-black dark:text-white mb-2 sm:mb-3">24/7</div>
              <p className="text-xs xs:text-sm sm:text-base text-gray-600 dark:text-gray-400 font-light">Always available</p>
            </div>
          </div>

          {/* Secondary Action */}
          <div className="mt-8 sm:mt-12 md:mt-16">
            <Link
              href="/music/search"
              className="inline-flex items-center text-xs xs:text-sm sm:text-base text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors duration-300 font-light"
            >
              Browse music library
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            </Link>
          </div>
        </div>
      </main>

      {/* Desktop Install Instructions Dialog */}
      <AlertDialog open={showInstructions} onOpenChange={setShowInstructions}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎵</span>
              </div>
              <div>
                <div className="font-semibold">{getInstallInstructions().title}</div>
                <div className="text-sm text-muted-foreground font-normal">Follow these steps to install Jammify</div>
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>To install Jammify as a desktop app:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {getInstallInstructions().steps.map((step, index) => (
                    <li key={index} className="text-foreground">{step}</li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground mt-4">
                  Once installed, you can access Jammify directly from your desktop without opening a browser.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogAction onClick={() => setShowInstructions(false)} className="bg-blue-600 hover:bg-blue-700">
              Got it
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}