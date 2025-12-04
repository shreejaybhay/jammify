export default function MusicLoader() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-8">
      <div className="loader">
        <div className="loader-inner">
          <div
            className="loader-block"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="loader-block"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="loader-block"
            style={{ animationDelay: "0.3s" }}
          ></div>
          <div
            className="loader-block"
            style={{ animationDelay: "0.4s" }}
          ></div>
          <div
            className="loader-block"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="loader-block"
            style={{ animationDelay: "0.6s" }}
          ></div>
          <div
            className="loader-block"
            style={{ animationDelay: "0.7s" }}
          ></div>
          <div
            className="loader-block"
            style={{ animationDelay: "0.8s" }}
          ></div>
        </div>
      </div>
    </div>
  );
}
