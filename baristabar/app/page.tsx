import { Navbar } from "@/components/organisms/Navbar/Navbar";

export default function Home() {
  return (
    <main>
      <Navbar />

      <section className="flex min-h-[80vh] items-center justify-center">
        <h1 className="text-4xl font-semibold">
          BaristaBar
        </h1>
      </section>
    </main>
  );
}