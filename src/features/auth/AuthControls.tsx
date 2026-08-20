import { useState, type ComponentType, type InputHTMLAttributes, type ReactNode, type SVGProps } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import Label from "../../components/form/Label";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface InputGroupProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: IconComponent;
  hint?: string;
  invalid?: boolean;
  passwordToggle?: boolean;
}

export function InputGroup({ label, icon: Icon, hint, invalid = false, passwordToggle = false, id, type, className = "", ...inputProps }: InputGroupProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const resolvedType = passwordToggle && type === "password" && passwordVisible ? "text" : type;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-gray-500" />
        <input
          {...inputProps}
          id={id}
          type={resolvedType}
          aria-invalid={invalid || undefined}
          aria-describedby={hint && id ? `${id}-hint` : undefined}
          className={`h-12 w-full rounded-xl border bg-gray-900 py-3 pl-11 ${passwordToggle ? "pr-11" : "pr-4"} text-sm text-white shadow-theme-xs outline-none transition placeholder:text-gray-500 ${invalid ? "border-error-500 focus:border-error-400 focus:ring-3 focus:ring-error-500/15" : "border-gray-700 hover:border-gray-600 focus:border-gray-400 focus:ring-3 focus:ring-white/10"} ${className}`}
        />
        {passwordToggle ? (
          <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={`${passwordVisible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`} className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-gray-500 transition hover:bg-white/5 hover:text-white">
            {passwordVisible ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
          </button>
        ) : null}
      </div>
      {hint ? <p id={id ? `${id}-hint` : undefined} className={`mt-1.5 text-theme-xs ${invalid ? "text-error-400" : "text-gray-500"}`}>{hint}</p> : null}
    </div>
  );
}

interface SocialButtonProps {
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function SocialButton({ children, icon, onClick, disabled = false }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-gray-700 bg-gray-900 px-4 text-sm font-medium text-gray-200 transition hover:border-gray-600 hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
    >
      {icon}
      {children}
    </button>
  );
}

interface StepItemProps {
  number: number;
  label: string;
  active?: boolean;
  complete?: boolean;
}

export function StepItem({ number, label, active = false, complete = false }: StepItemProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5" aria-current={active ? "step" : undefined}>
      <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-theme-xs font-semibold ${active || complete ? "border-gray-200 bg-white text-gray-950" : "border-gray-700 bg-gray-900 text-gray-500"}`}>
        {complete ? <Check aria-hidden="true" className="size-3.5" /> : number}
      </span>
      <span className={`truncate text-theme-xs font-medium ${active ? "text-white" : "text-gray-500"}`}>{label}</span>
    </div>
  );
}
