"use client";

import * as React from "react";

import { AlertBanner } from "./alert-banner";
import { Button } from "./button";
import { ButtonGroup } from "./button-group";
import { CardDouble } from "./card-double";
import { Input } from "./input";

type ComboBoxProps = {
  data: string[][];
  label?: string;
  placeholder?: string;
  maxResults?: number;
};

const ComboBox = ({
  data,
  label,
  placeholder = "Search...",
  maxResults = 5,
}: ComboBoxProps) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filtered = React.useMemo(() => {
    if (data.length <= 1) return [];
    const sliced = data.slice(1);
    if (!searchTerm.trim()) return [];
    return sliced.filter((entry) =>
      entry[0]?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [data, searchTerm]);

  const displayed = React.useMemo(() => {
    if (data.length <= 1) return [];
    const sliced = data.slice(1);
    if (filtered.length >= maxResults) return filtered.slice(0, maxResults);
    if (filtered.length === 0 && searchTerm.trim())
      return sliced.slice(0, maxResults);
    if (filtered.length > 0 && filtered.length < maxResults) {
      const needed = maxResults - filtered.length;
      const remainder = sliced.filter((entry) => !filtered.includes(entry));
      return [...filtered, ...remainder.slice(0, needed)];
    }
    return sliced.slice(0, maxResults);
  }, [filtered, data, searchTerm, maxResults]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  return (
    <>
      <div className="p-0">
        <Input
          autoComplete="off"
          placeholder={placeholder}
          name="combo-box-search"
          value={searchTerm}
          onChange={handleChange}
        />
      </div>
      {displayed.map((entry, index) => (
        <CardDouble
          key={entry[0] ?? `entry-${index}`}
          title={entry[0] ?? "Untitled"}
        >
          <AlertBanner>{entry[1] ?? "No description available"}</AlertBanner>
          <br />
          <ButtonGroup isFull>
            <Button>FAVORITE</Button>
            <Button>DONATE</Button>
            <Button>LEARN MORE</Button>
          </ButtonGroup>
        </CardDouble>
      ))}
    </>
  );
};

export { ComboBox };
