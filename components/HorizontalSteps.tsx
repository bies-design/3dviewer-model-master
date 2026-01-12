"use client";

import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@heroui/react';

interface Step {
  title: string;
}

interface HorizontalStepsProps {
  steps: Step[];
  currentStep?: number;
}

const HorizontalSteps: React.FC<HorizontalStepsProps> = ({ steps, currentStep = 1 }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <React.Fragment key={step.title}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    isCompleted ? 'bg-primary text-primary-foreground' : '',
                    isActive ? 'bg-primary/20 text-primary border-2 border-primary' : '',
                    !isCompleted && !isActive ? 'bg-default-200 text-default-foreground' : ''
                  )}
                >
                  {isCompleted ? <CheckIcon className="w-5 h-5" /> : stepNumber}
                </div>
                <p className={cn("text-xs mt-2 text-center", isActive ? "text-primary font-semibold" : "text-default-500")}>{step.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={cn("flex-1 h-1 mx-2", isCompleted ? "bg-primary" : "bg-default-200")} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default HorizontalSteps;