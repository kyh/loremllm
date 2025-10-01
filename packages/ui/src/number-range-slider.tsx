'use client';

import * as React from 'react';

interface NumberRangeSliderProps {
  defaultValue?: number;
  max?: number;
  min?: number;
  step?: number;
}

const NumberRangeSlider: React.FC<NumberRangeSliderProps> = ({ defaultValue = 0, max = 5000, min = 0, step = 1 }) => {
  const sliderRef = React.useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = React.useState<number>(defaultValue);

  const maxDigits = max.toString().length;

  const padValue = (value: number): string => {
    return value.toString().padStart(maxDigits, '0');
  };

  React.useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.value = String(defaultValue);
    }
    setDisplayValue(defaultValue);
  }, [defaultValue]);

  const scrub = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(event.target.value, 10);
    setDisplayValue(value);
  };

  return (
    <div className="flex items-center justify-between">
      <label className="flex-shrink-0">
        <div className="flex-shrink-0 bg-[var(--theme-text)] text-[var(--theme-background)] font-normal px-[1ch]">{padValue(displayValue)}</div>
      </label>
      <input className="rounded-none block m-0 p-0 w-full min-w-[10%] appearance-none bg-[var(--theme-border-subdued)] focus:bg-gradient-to-r focus:from-transparent focus:to-[var(--theme-focused-foreground)] focus:outline-none hover:bg-gradient-to-r hover:from-transparent hover:to-[var(--theme-focused-foreground)] hover:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:text-[var(--font-size)] [&::-webkit-slider-thumb]:w-[1ch] [&::-webkit-slider-thumb]:h-[calc(var(--font-size)*var(--theme-line-height-base))] [&::-webkit-slider-thumb]:bg-[var(--theme-button-foreground)] [&::-webkit-slider-thumb]:align-bottom [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-runnable-track]:h-[calc(var(--font-size)*var(--theme-line-height-base))] [&::-webkit-slider-runnable-track]:bg-[var(--theme-border-subdued)] [&::-webkit-slider-runnable-track]:rounded-none [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:text-[var(--font-size)] [&::-moz-range-thumb]:w-[1ch] [&::-moz-range-thumb]:h-[calc(var(--font-size)*var(--theme-line-height-base))] [&::-moz-range-thumb]:bg-[var(--theme-button-foreground)] [&::-moz-range-thumb]:align-bottom [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-none [&::-moz-range-track]:h-[calc(var(--font-size)*var(--theme-line-height-base))] [&::-moz-range-track]:bg-[var(--theme-border-subdued)] [&::-moz-range-track]:rounded-none [&::-ms-thumb]:appearance-none [&::-ms-thumb]:text-[var(--font-size)] [&::-ms-thumb]:w-[1ch] [&::-ms-thumb]:h-[calc(var(--font-size)*var(--theme-line-height-base))] [&::-ms-thumb]:bg-[var(--theme-button-foreground)] [&::-ms-thumb]:align-bottom [&::-ms-thumb]:cursor-pointer [&::-ms-thumb]:border-none [&::-ms-track]:h-[calc(var(--font-size)*var(--theme-line-height-base))] [&::-ms-track]:bg-transparent [&::-ms-track]:border-transparent [&::-ms-track]:text-transparent [&::-ms-fill-lower]:bg-[var(--theme-border-subdued)] [&::-ms-fill-upper]:bg-[var(--theme-border-subdued)]" defaultValue={defaultValue} max={max} min={min} onChange={scrub} ref={sliderRef} role="slider" step={step} tabIndex={0} type="range" />
    </div>
  );
};

export { NumberRangeSlider };
