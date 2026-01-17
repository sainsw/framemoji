import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DatePickerPopover } from "../DatePickerPopover";

describe("DatePickerPopover", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    selectedDate: "2025-12-15",
    onSelectDate: vi.fn(),
    availableDates: new Set(["2025-12-10", "2025-12-11", "2025-12-14", "2025-12-15"]),
    completedDates: new Set(["2025-12-10", "2025-12-11"]),
    today: "2025-12-15",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(<DatePickerPopover {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when open", () => {
    render(<DatePickerPopover {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("displays the current month and year", () => {
    render(<DatePickerPopover {...defaultProps} />);
    expect(screen.getByText("December 2025")).toBeInTheDocument();
  });

  it("renders weekday headers", () => {
    render(<DatePickerPopover {...defaultProps} />);
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("renders day buttons", () => {
    render(<DatePickerPopover {...defaultProps} />);
    // Should have buttons for days 1-31 (December has 31 days)
    expect(screen.getByRole("button", { name: /^1 December/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^15 December/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^31 December/i })).toBeInTheDocument();
  });

  it("highlights today with special styling", () => {
    render(<DatePickerPopover {...defaultProps} />);
    const todayButton = screen.getByRole("button", { name: /15 December 2025 \(today\)/i });
    expect(todayButton).toHaveClass("is-today");
  });

  it("marks completed dates with checkmark", () => {
    render(<DatePickerPopover {...defaultProps} />);
    const completedButton = screen.getByRole("button", { name: /10 December.*\(completed\)/i });
    expect(completedButton).toHaveClass("is-completed");
    expect(completedButton.querySelector(".date-picker-check")).toHaveTextContent("✓");
  });

  it("disables unavailable dates", () => {
    render(<DatePickerPopover {...defaultProps} />);
    // December 12 is not in availableDates
    const unavailableButton = screen.getByRole("button", { name: /12 December.*\(unavailable\)/i });
    expect(unavailableButton).toBeDisabled();
  });

  it("disables future dates", () => {
    render(<DatePickerPopover {...defaultProps} />);
    // December 16 is after today (15)
    const futureButton = screen.getByRole("button", { name: /16 December/i });
    expect(futureButton).toBeDisabled();
    expect(futureButton).toHaveClass("is-future");
  });

  it("calls onSelectDate when clicking an available date", () => {
    const onSelectDate = vi.fn();
    render(<DatePickerPopover {...defaultProps} onSelectDate={onSelectDate} />);
    
    const availableButton = screen.getByRole("button", { name: /14 December/i });
    fireEvent.click(availableButton);
    
    expect(onSelectDate).toHaveBeenCalledWith("2025-12-14");
  });

  it("calls onClose after selecting a date", () => {
    const onClose = vi.fn();
    render(<DatePickerPopover {...defaultProps} onClose={onClose} />);
    
    const availableButton = screen.getByRole("button", { name: /14 December/i });
    fireEvent.click(availableButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking backdrop", () => {
    const onClose = vi.fn();
    render(<DatePickerPopover {...defaultProps} onClose={onClose} />);
    
    // The backdrop is the element with the date-picker-backdrop class
    const backdrop = document.querySelector(".date-picker-backdrop")!;
    fireEvent.click(backdrop);
    
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when pressing Escape", () => {
    const onClose = vi.fn();
    render(<DatePickerPopover {...defaultProps} onClose={onClose} />);
    
    // The backdrop handles key events
    const backdrop = document.querySelector(".date-picker-backdrop")!;
    fireEvent.keyDown(backdrop, { key: "Escape" });
    
    expect(onClose).toHaveBeenCalled();
  });

  it("navigates to previous month", () => {
    render(<DatePickerPopover {...defaultProps} />);
    
    const prevButton = screen.getByRole("button", { name: /previous month/i });
    fireEvent.click(prevButton);
    
    expect(screen.getByText("November 2025")).toBeInTheDocument();
  });

  it("navigates to next month when available", () => {
    // Start in November to allow forward navigation
    render(
      <DatePickerPopover 
        {...defaultProps} 
        selectedDate="2025-11-15"
        today="2025-12-15"
      />
    );
    
    const nextButton = screen.getByRole("button", { name: /next month/i });
    expect(nextButton).not.toBeDisabled();
    fireEvent.click(nextButton);
    
    expect(screen.getByText("December 2025")).toBeInTheDocument();
  });

  it("disables next month button when viewing current month", () => {
    render(<DatePickerPopover {...defaultProps} />);
    
    const nextButton = screen.getByRole("button", { name: /next month/i });
    expect(nextButton).toBeDisabled();
  });

  it("handles year boundaries when navigating months", () => {
    render(
      <DatePickerPopover 
        {...defaultProps} 
        selectedDate="2025-01-15"
        today="2025-12-15"
      />
    );
    
    // Go back from January 2025 to December 2024
    const prevButton = screen.getByRole("button", { name: /previous month/i });
    fireEvent.click(prevButton);
    
    expect(screen.getByText("December 2024")).toBeInTheDocument();
  });

  it("renders legend", () => {
    render(<DatePickerPopover {...defaultProps} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("allows selecting today even if not in availableDates", () => {
    const onSelectDate = vi.fn();
    render(
      <DatePickerPopover 
        {...defaultProps} 
        availableDates={new Set()} // Empty available dates
        onSelectDate={onSelectDate}
      />
    );
    
    const todayButton = screen.getByRole("button", { name: /15 December 2025 \(today\)/i });
    expect(todayButton).not.toBeDisabled();
    
    fireEvent.click(todayButton);
    expect(onSelectDate).toHaveBeenCalledWith("2025-12-15");
  });
});
