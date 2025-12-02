import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  MessageCircle, 
  Download, 
  CheckSquare,
  Navigation,
  Grid3X3,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const steps = [
  {
    icon: Navigation,
    title: 'Navigation',
    description: 'Swipe left/right to navigate through photos. Use breadcrumbs to move between folders.',
  },
  {
    icon: Heart,
    title: 'Like Photos',
    description: 'Tap the heart icon to like your favorite photos. Access all liked photos from the profile menu.',
  },
  {
    icon: MessageCircle,
    title: 'Add Comments',
    description: 'Tap the comment icon to leave notes on any photo. Great for feedback!',
  },
  {
    icon: Grid3X3,
    title: 'Grid Options',
    description: 'Adjust the gallery grid from 1-8 columns. Find your perfect view.',
  },
  {
    icon: CheckSquare,
    title: 'Selection Rules',
    description: 'Select photos for your final delivery. Your selection limit: 25 photos. Submit when ready!',
  },
  {
    icon: Download,
    title: 'Downloads',
    description: 'Download watermarked versions of any photo. Full resolution available after selection.',
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { markOnboardingComplete } = useAuth();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      markOnboardingComplete();
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md bg-card rounded-2xl shadow-large overflow-hidden"
      >
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 pt-6 pb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-6 bg-primary'
                  : index < currentStep
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button onClick={handleNext} className="gap-2 bg-primary hover:bg-primary/90">
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
