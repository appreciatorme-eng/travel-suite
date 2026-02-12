import Link from "next/link";
import { Plane, MapPin, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 py-20 bg-gradient-to-br from-blue-50 via-white to-emerald-50 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto relative z-10 animate-fade-in-up">
        {/* Logo Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-3xl shadow-xl mb-8 transform hover:scale-105 transition-transform duration-300">
          <Plane className="w-12 h-12 text-white" />
        </div>

        {/* Main Title */}
        <h1 className="text-6xl md:text-7xl font-serif text-secondary mb-6 tracking-tight leading-tight drop-shadow-sm">
          GoBuddy <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500">Adventures</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
          Your AI-powered travel companion. Create personalized luxury itineraries in seconds.
        </p>

        {/* CTA Button */}
        <Link href="/planner">
          <Button size="lg" className="h-16 px-10 rounded-full text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 gap-3 group bg-primary hover:bg-primary/90">
            <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            Start Planning
            <ArrowRight className="w-5 h-5 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto w-full relative z-10">
        <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-8 text-center flex flex-col items-center h-full">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-xl text-secondary mb-3">Any Destination</h3>
            <p className="text-gray-500 leading-relaxed">
              Plan trips to any city in the world with intelligent, AI-curated recommendations tailored just for you.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 md:translate-y-4">
          <CardContent className="p-8 text-center flex flex-col items-center h-full">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-xl text-secondary mb-3">Custom Duration</h3>
            <p className="text-gray-500 leading-relaxed">
              From quick weekend getaways to extended adventures, we craft the perfect schedule for your time.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-sm border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-8 text-center flex flex-col items-center h-full">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-xl text-secondary mb-3">AI-Powered</h3>
            <p className="text-gray-500 leading-relaxed">
              Deeply personalized itineraries generated instantly based on your unique interests, budget, and style.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}


