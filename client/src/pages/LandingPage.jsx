import { Link } from 'react-router-dom';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import { Sparkles, Moon, BookOpen, Shield, Zap, Stars } from 'lucide-react';
import StarField from '../components/StarField';
import Footer from '../components/Footer';

export default function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="relative min-h-screen">
      <StarField />

      {/* Hero */}
      <section className="relative pt-24 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 badge-dream mb-8 animate-fade-in">
            <Stars className="w-3.5 h-3.5" />
            <span>AI-powered bedtime stories for little dreamers</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="bg-gradient-to-r from-night-950 via-dream-600 to-purple-600 dark:from-white dark:via-dream-200 dark:to-purple-300 bg-clip-text text-transparent">
              Turn photos into
            </span>
            <br />
            <span className="bg-gradient-to-r from-gold-600 to-dream-600 dark:from-gold-400 dark:to-dream-300 bg-clip-text text-transparent animate-float inline-block">
              magical stories ✨
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-white/60 max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Upload a photo of your child's favourite toy, pet, or adventure. 
            DreamWeaver uses AI to create a warm, personalised bedtime story 
            — every single night.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {isSignedIn ? (
              <Link to="/app" className="btn-primary text-base px-8 py-4">
                <Sparkles className="w-5 h-5" />
                Generate a Story
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className="btn-primary text-base px-8 py-4">
                  <Sparkles className="w-5 h-5" />
                  Start for Free
                </button>
              </SignInButton>
            )}
            <Link to="/pricing" className="btn-secondary text-base px-8 py-4">
              View Pricing
            </Link>
          </div>

          <p className="text-xs text-gray-400 dark:text-white/30 mt-4">3 free stories on signup · No credit card required</p>
        </div>

        {/* Floating preview card */}
        <div className="mt-16 max-w-lg mx-auto animate-float">
          <div className="card border-dream-500/30 shadow-dream-lg text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-dream-500 to-purple-600 flex items-center justify-center">
                <Moon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-white/40">Tonight's story</p>
                <p className="font-semibold text-gray-900 dark:text-white">Cloudberry's Moonlight Voyage</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-white/70 text-sm leading-relaxed">
              "In a land where the stars were made of honey, a little bear named Cloudberry discovered 
              a tiny boat at the edge of the Silver Lake. The moonbeams tickled her fuzzy ears as she 
              climbed in and began to drift..."
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="badge-gold">Favourite ⭐</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="section-title text-center mb-4">Everything a bedtime needs</h2>
          <p className="text-gray-500 dark:text-white/50 text-center mb-14 max-w-xl mx-auto">
            Built with love and safety-first AI — the perfect companion for your nightly ritual.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Moon className="w-6 h-6" />,
                title: 'Night Mode UI',
                desc: 'Gentle dark interface that won\'t disturb little eyes at bedtime.',
                color: 'text-dream-300',
                bg: 'bg-dream-500/10',
                disabled: false,
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'Family-Safe AI',
                desc: 'Strict guardrails ensure every story is kind, warm, and age-appropriate.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                disabled: false,
              },
              {
                icon: <BookOpen className="w-6 h-6" />,
                title: 'Story Library',
                desc: 'Save favourites to your private vault and re-read them anytime.',
                color: 'text-gold-400',
                bg: 'bg-gold-500/10',
                disabled: false,
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'Instant Generation',
                desc: 'Photo to story in under 10 seconds, powered by GPT-4o.',
                color: 'text-purple-300',
                bg: 'bg-purple-500/10',
                disabled: false,
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: 'Text-to-Speech',
                desc: 'Let the app read the story aloud in a soothing voice.',
                color: 'text-pink-300',
                bg: 'bg-pink-500/10',
                disabled: true,
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'Private & Secure',
                desc: 'Photos and stories are private to your account — always.',
                color: 'text-cyan-400',
                bg: 'bg-cyan-500/10',
              },
            ].map((f) => (
              <div key={f.title} className={`card-hover ${f.disabled ? 'opacity-60' : ''}`}>
                <div className={`inline-flex p-3 rounded-xl ${f.bg} ${f.color} mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  {f.title}
                  {f.disabled && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-dream-500/20 text-dream-400 border border-dream-500/30 tracking-wide">COMING SOON</span>
                  )}
                </h3>
                <p className="text-gray-500 dark:text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto card border-dream-500/30 shadow-dream-lg">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to weave tonight's dream?</h2>
          <p className="text-gray-500 dark:text-white/50 mb-8">Start with 3 free stories — no credit card required.</p>
          {isSignedIn ? (
            <Link to="/app" className="btn-gold text-base px-8 py-4 inline-flex">
              <Sparkles className="w-5 h-5" /> Create a Story Now
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button className="btn-gold text-base px-8 py-4">
                <Sparkles className="w-5 h-5" /> Get Started Free
              </button>
            </SignInButton>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
