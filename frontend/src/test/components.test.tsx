import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ComponentPreviewPage } from "../features/home/ComponentPreviewPage.tsx";
import { SessionProvider } from "../app/SessionContext.tsx";

describe("pratinjau komponen", () => {
  it("menampilkan form, tabel, dan dialog konfirmasi", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SessionProvider>
          <ComponentPreviewPage />
        </SessionProvider>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /buka dialog konfirmasi/i }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ya, lanjutkan/i }));
    expect(screen.getByText(/konfirmasi diterima/i)).toBeInTheDocument();
  });
});
