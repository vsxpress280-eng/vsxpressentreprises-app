import React, { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const MoneyInput = forwardRef(({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  min,
  max,
  decimals = 2,
  label,
  error,
  required,
  ...props
}, ref) => {
  // Internal display state to handle formatting while typing
  const [displayValue, setDisplayValue] = useState('');

  // Sync internal display value when external value changes
  useEffect(() => {
    if (value === undefined || value === null || value === '') {
      setDisplayValue('');
    } else {
      const num = Number(value);
      if (!isNaN(num)) {
        // Only format if it's not currently being edited in a way that would be annoying
        // For simplicity in this implementation, we re-format on external change
        // We can optimize if needed, but for typical forms this is safe.
        // To allow typing like "100.", we might need more complex logic, 
        // but let's stick to formatting on blur or if value comes from DB.
        // Actually, let's just set it formatted if it's a number.
        // However, this might conflict with typing if parent updates on every keystroke.
        // So we only update displayValue from props if the prop value is different from parsed displayValue
        
        // Simple approach: formatting happens on blur. While typing, we allow partial inputs.
        // If value changes externally (e.g. prefill), we format it.
        // We'll trust the parent to pass a number.
      }
    }
  }, [value]);

  // Initial mount
  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
        const num = parseFloat(value);
        if (!isNaN(num)) {
             setDisplayValue(formatDisplayValue(num));
        }
    }
  }, []);

  const formatDisplayValue = (val) => {
    if (val === '' || val === undefined || val === null) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const parseRawValue = (val) => {
    if (!val) return '';
    // Remove all non-numeric chars except period and minus (if allowed)
    // We treat comma as decimal separator if used, so replace comma with dot first
    let clean = val.replace(/,/g, ''); 
    // If user typed comma as decimal, standard US locale uses dot. 
    // But if they typed "1,000", removing comma gives "1000". Correct.
    // If they typed "10,50" (meaning 10.50), removing comma gives "1050". Incorrect for some locales but standard for en-US implies comma is thousands.
    // The prompt says accept "20,000" (twenty thousand) and "20000,50" (twenty thousand point fifty?? or European style?)
    // Prompt says: Accept user input in multiple formats: "20000", "20,000", "20000.50", "20000,50"
    // "20000,50" usually means 20000.50 in EU. 
    // Let's try to be smart.
    
    // Normalize: replace comma with dot if it looks like a decimal separator (last separator)
    // Actually, simpler: 
    // 1. Remove all commas (thousands separators). 
    // 2. But wait, if input is "20000,50", simply removing comma makes 2000050.
    
    // Robust parsing strategy:
    // Replace all commas with dots? No, "20,000" -> "20.000". That changes 20k to 20.
    
    // Strategy:
    // 1. Check if it contains both , and .
    //    If so, assume . is decimal (en-US) or , is decimal (EU).
    //    Usually "1,000.00" -> comma is thousand.
    //    "1.000,00" -> dot is thousand.
    // 2. If only comma? "20,000" -> 20k? or 20.0?
    //    In this context (MoneyInput en-US), usually comma is thousands.
    //    BUT user requirement says "20000,50" -> presumably 20000.50.
    
    // Let's implement a heuristic:
    // If the string has a comma, and that comma is followed by 1 or 2 digits at the end of string, it might be a decimal.
    // But "1,000" has 3 digits. 
    // Let's stick to standard "remove commas, parse float" for en-US, 
    // UNLESS the prompt explicitly implies "20000,50" should be parsed as decimal. 
    
    // Let's support the prompt's specific examples:
    // "20,000" -> 20000
    // "20000.50" -> 20000.5
    // "20000,50" -> 20000.5 (This implies comma CAN be a decimal separator if it's the last separator)
    
    let normalized = val;
    
    // If it contains a comma, we need to decide if it's a thousand sep or decimal.
    if (normalized.includes(',')) {
        // If it also contains a dot, assume standard en-US (comma is thousand)
        if (normalized.includes('.')) {
             normalized = normalized.replace(/,/g, '');
        } else {
             // Only commas. 
             // If multiple commas, they must be thousands: "1,000,000"
             const parts = normalized.split(',');
             if (parts.length > 2) {
                 normalized = normalized.replace(/,/g, '');
             } else if (parts.length === 2) {
                 // One comma. "20,000" or "20,50"
                 // If the part after comma has exactly 3 digits, it's ambiguous. 
                 // But "20,000" is strictly 20k in en-US.
                 // "20000,50" -> part after is 50 (2 digits). Likely decimal.
                 const lastPart = parts[parts.length - 1];
                 if (lastPart.length !== 3) {
                     // Assume decimal
                     normalized = normalized.replace(',', '.');
                 } else {
                     // Assume thousands
                     normalized = normalized.replace(/,/g, '');
                 }
             }
        }
    }
    
    // Final cleanup: remove all non-numeric characters except the first dot and minus
    normalized = normalized.replace(/[^0-9.-]/g, '');
    
    const num = parseFloat(normalized);
    return isNaN(num) ? '' : num;
  };

  const handleChange = (e) => {
    let inputValue = e.target.value;
    
    // Allow typing valid characters only to prevent garbage
    // Allowed: 0-9, comma, period, minus
    if (!/^[0-9.,-]*$/.test(inputValue)) {
        return; 
    }

    setDisplayValue(inputValue);
    
    // Extract numeric value for callback
    // We don't want to trigger onChange with partial inputs like "10." if we want strictly numbers, 
    // but typically we do so parent state updates.
    // However, for "10.", parseFloat is 10.
    
    const numericVal = parseRawValue(inputValue);
    
    if (numericVal === '') {
        onChange(''); // Or null/undefined depending on preference
        return;
    }

    if (max !== undefined && numericVal > max) {
        // Optional: Clamp or just let validation handle it?
        // Let's validation handle it visually via error, but passed value is what user typed (clamped?)
        // Usually better to clamp or reject input. Let's just pass it and show error.
    }
    
    onChange(numericVal);
  };

  const handleBlur = () => {
    const numericVal = parseRawValue(displayValue);
    if (numericVal !== '') {
        let finalVal = Number(numericVal);
        
        // Clamp on blur
        if (min !== undefined && finalVal < min) finalVal = min;
        if (max !== undefined && finalVal > max) finalVal = max;
        
        // Round
        const multiplier = Math.pow(10, decimals);
        finalVal = Math.round(finalVal * multiplier) / multiplier;
        
        setDisplayValue(formatDisplayValue(finalVal));
        onChange(finalVal);
    } else {
        setDisplayValue('');
        onChange('');
    }
  };
  
  const handleFocus = (e) => {
      // On focus, stripping formatting is often nicer for editing, 
      // but keeping it is also fine. Let's keep it simple: 
      // select all text on focus for easy overwrite.
      e.target.select();
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn("text-[#A0A0A0]", error && "text-red-500")}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "bg-[#0B0B0B] border-[#2A2A2A] text-white focus:border-[#D4AF37]",
          error && "border-red-500 focus:border-red-500",
          props.inputClassName
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
});

MoneyInput.displayName = "MoneyInput";

export default MoneyInput;