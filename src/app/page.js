import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
          <div className="text-base sm:text-lg md:text-xl font-medium text-black dark:text-white">
            MusicApp
          </div>
          <ModeToggle />
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

          {/* CTA Button */}
          <div className="mb-12 sm:mb-16 md:mb-20">
            <Link
              href="/music"
              className="group inline-flex items-center justify-center px-8 sm:px-10 md:px-12 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-medium text-white bg-black dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 ease-out min-w-[200px] w-full max-w-sm sm:w-auto"
            >
              Get Started
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
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
    </div>
  );
}