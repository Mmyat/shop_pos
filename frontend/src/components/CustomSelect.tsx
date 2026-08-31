import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(240, options.length * 36 + 8);
    const gap = 6;
    let top = rect.bottom + gap;
    // flip above if it would overflow viewport
    if (top + dropdownHeight + 16 > window.innerHeight) {
      top = rect.top - dropdownHeight - gap;
      if (top < 8) top = 8;
    }
    setPos({ top, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          buttonRef.current &&
          !buttonRef.current.contains(target) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(target)
        ) {
          setIsOpen(false);
        }
      };
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsOpen(false);
      };
      const handleScroll = () => setIsOpen(false);
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
      window.addEventListener("resize", handleScroll);
      // don't close on window scroll if inside modal scroll — just reposition or close
      // close on scroll to avoid detached dropdown
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEsc);
        window.removeEventListener("resize", handleScroll);
      };
    }
  }, [isOpen, options.length]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-xl bg-white text-sm text-left transition-all outline-none
          ${isOpen ? "border-primary-500 ring-2 ring-primary-500/20" : "border-gray-200 hover:border-gray-300"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "cursor-pointer"}
          focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20`}
      >
        <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder || "Select..."}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary-500" : ""}`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 100,
            }}
            className="bg-white border border-gray-100 rounded-xl shadow-xl py-1 overflow-hidden animate-[fadeIn_0.15s_ease-out]"
          >
            <div className="max-h-60 overflow-y-auto overscroll-contain scrollbar-thin py-1">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400 text-center">No options</div>
              ) : (
                options.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors
                        ${isSelected ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <span className="truncate pr-2">{opt.label}</span>
                      {isSelected && <Check size={14} className="shrink-0 text-primary-600" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default CustomSelect;
