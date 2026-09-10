import { createFileRoute } from "@tanstack/react-router";
import { AirportApp } from "@/game/AirportApp";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <AirportApp />;
}
