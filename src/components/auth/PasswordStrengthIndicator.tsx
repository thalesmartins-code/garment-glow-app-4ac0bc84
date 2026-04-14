import { validatePassword } from "@/utils/passwordValidation";
import { cn } from "@/lib/utils";

interface Props {
  password: string;
}

const strengthConfig = {
  weak: { label: "Fraca", color: "bg-destructive", bars: 1 },
  medium: { label: "Média", color: "bg-yellow-500", bars: 2 },
  strong: { label: "Forte", color: "bg-success", bars: 3 },
};

export function PasswordStrengthIndicator({ password }: Props) {
  if (!password) return null;

  const { errors, strength } = validatePassword(password);
  const config = strengthConfig[strength];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= config.bars ? config.color : "bg-muted"
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Força: {config.label}</span>
      </div>
      {errors.length > 0 && (
        <ul className="text-xs text-destructive space-y-0.5">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
