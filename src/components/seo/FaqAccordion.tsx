import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export type FaqItem = {
  q: string;
  a: string;
  /**
   * Optional rich React node to render in the visible answer. When provided, it
   * is shown instead of the plain `a` string, but the plain `a` remains the
   * canonical text used for the FAQPage JSON-LD (so visible content and
   * structured data stay equivalent).
   */
  aNode?: ReactNode;
};

type Props = {
  items: FaqItem[];
  /** How many of the leading items to expand by default (most relevant first). Default 2. */
  defaultOpenCount?: number;
  className?: string;
};

/**
 * Accessible FAQ accordion built on Radix Accordion.
 * - Keyboard: Tab to focus a trigger; Enter/Space to toggle; ↑/↓ Home/End to move between triggers.
 * - Multi-select so users can compare answers.
 * - The first `defaultOpenCount` items (assumed most relevant) are expanded on mount.
 * - Each trigger is an <h3> for proper document outline; mirrors the FAQPage JSON-LD content.
 */
const FaqAccordion = ({ items, defaultOpenCount = 2, className }: Props) => {
  const defaultValue = items.slice(0, Math.max(0, defaultOpenCount)).map((_, i) => `faq-${i}`);

  return (
    <Accordion type="multiple" defaultValue={defaultValue} className={className}>
      {items.map((item, i) => (
        <AccordionItem key={item.q} value={`faq-${i}`}>
          <AccordionTrigger className="text-left text-base md:text-lg font-semibold">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground text-base leading-relaxed">
            {item.aNode ?? item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default FaqAccordion;
