import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { EmptySackIllustration } from "../components/icons/Illustrations";
import { HiOutlineHome } from "react-icons/hi2";

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="screen flex items-center justify-center px-5">
      <div className="col text-center">
        <EmptySackIllustration className="w-32 h-28 mx-auto" />
        <h2 className="text-[24px] font-bold tracking-[-0.02em] mt-4">Nothing here</h2>
        <p className="text-[14px] text-muted mt-1.5 max-w-[30ch] mx-auto">
          This page doesn't exist, or it has moved somewhere else.
        </p>
        <div className="mt-6">
          <Button onClick={() => navigate("/dashboard")} variant="primary" icon={HiOutlineHome}>
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
};
