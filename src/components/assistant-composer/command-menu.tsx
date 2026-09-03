import * as React from "react";
import { cn } from "../../lib/cn";
import type { UseSlashCommandsResult } from "../../hooks/use-slash-commands";
import type { AssistantComposerProps, ComposerLabels } from "./assistant-composer.types";

export interface CommandMenuProps {
  menu: UseSlashCommandsResult;
  labels: ComposerLabels;
  renderCommandItem?: AssistantComposerProps["renderCommandItem"];
}

/**
 * The listbox half of the combobox. Focus never enters it — the textarea keeps
 * focus and points at the active option with `aria-activedescendant`.
 */
export function CommandMenu(props: CommandMenuProps): React.ReactElement {
  const { menu, labels, renderCommandItem } = props;
  const { items, activeIndex } = menu;

  let lastGroup: string | undefined;

  return (
    <ul
      {...menu.getListProps()}
      aria-label={labels.commands}
      className="absolute bottom-full left-0 z-10 mb-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 shadow-lg"
    >
      {items.length === 0 && (
        /* Not an option: an empty listbox with a message is announced as
           "0 items", and a fake option would be selectable. */
        <li role="presentation" className="px-2 py-1.5 text-sm text-fg-subtle">
          {labels.noCommands}
        </li>
      )}

      {items.map((command, index) => {
        const group = command.group;
        const heading = group !== undefined && group !== lastGroup ? group : undefined;
        lastGroup = group;
        const active = index === activeIndex;

        return (
          <React.Fragment key={command.id}>
            {heading !== undefined && (
              <li
                role="presentation"
                className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-fg-subtle"
              >
                {heading}
              </li>
            )}
            <li
              {...menu.getItemProps(command, index)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-fg",
                active && "bg-accent/12",
                command.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {renderCommandItem ? (
                renderCommandItem(command, { active, index })
              ) : (
                <>
                  {command.icon}
                  <span className="font-medium">{command.name}</span>
                  {command.description !== undefined && (
                    <span className="truncate text-xs text-fg-muted">{command.description}</span>
                  )}
                </>
              )}
            </li>
          </React.Fragment>
        );
      })}
    </ul>
  );
}
