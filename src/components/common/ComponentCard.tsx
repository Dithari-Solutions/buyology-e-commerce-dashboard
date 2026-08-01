import type { ReactNode } from "react";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
  /** Optional right-aligned header actions. */
  actions?: ReactNode;
  /** Drop the body padding — for cards whose child is a full-bleed table. */
  flush?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  actions,
  flush = false,
}) => {
  return (
    <div className={`ui-card ${className}`}>
      {/* Card Header */}
      <div className="ui-card-head">
        <div className="min-w-0">
          <h3 className="ui-section-title truncate">{title}</h3>
          {desc && <p className="ui-muted mt-0.5">{desc}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Card Body */}
      <div className={flush ? "" : "ui-card-body"}>
        <div className={flush ? "" : "space-y-4"}>{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
