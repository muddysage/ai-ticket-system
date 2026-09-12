// Fetches and displays one ticket together with its AI analysis and assignment data.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const resolveTicket = async () => {
    if (!token) return;

    try {
      setResolving(true);
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/tickets/${id}/resolve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            moderatorNotes: "Resolved by moderator",
            userRating: 5,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Unable to resolve ticket");
        return;
      }

      alert("Ticket resolved successfully");
      const refreshed = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/tickets/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const refreshedData = await refreshed.json();
      if (refreshed.ok) {
        setTicket(refreshedData.ticket);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while resolving the ticket");
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/tickets/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setTicket(data.ticket);
        } else {
          alert(data.message || "Failed to fetch ticket");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  if (loading)
    return <div className="text-center mt-10">Loading ticket details...</div>;
  if (!ticket) return <div className="text-center mt-10">Ticket not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Ticket Details</h2>

      <div className="card bg-gray-800 shadow p-4 space-y-4">
        <div className="flex justify-between items-center gap-4">
          <h3 className="text-xl font-semibold">{ticket.title}</h3>
          {(user.role === "moderator" || user.role === "admin") &&
            ticket.status !== "resolved" && (
              <button className="btn btn-success btn-sm" onClick={resolveTicket} disabled={resolving}>
                {resolving ? "Resolving..." : "Resolve Ticket"}
              </button>
            )}
        </div>
        <p>{ticket.description}</p>

        {ticket.status && (
          <>
            <div className="divider">Metadata</div>
            <p>
              <strong>Status:</strong> {ticket.status}
            </p>
            {ticket.priority && (
              <p>
                <strong>Priority:</strong> {ticket.priority}
              </p>
            )}

            {ticket.relatedSkills?.length > 0 && (
              <p>
                <strong>Related Skills:</strong>{" "}
                {ticket.relatedSkills.join(", ")}
              </p>
            )}

            {ticket.helpfulNotes && (
              <div>
                <strong>Helpful Notes:</strong>
                <div className="prose max-w-none rounded mt-2">
                  <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            {ticket.assignedTo && (
              <p>
                <strong>Assigned To:</strong> {ticket.assignedTo?.email}
              </p>
            )}

            {ticket.createdAt && (
              <p className="text-sm text-gray-500 mt-2">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
            )}

            {ticket.suggestedSolution && (
              <div className="rounded border border-blue-500 bg-slate-900 p-4 mt-4">
                <h3 className="text-lg font-semibold text-blue-300">
                  🤖 AI Suggested Solution
                </h3>
                <p className="mt-2 whitespace-pre-wrap">{ticket.suggestedSolution}</p>

                {typeof ticket.confidenceScore === "number" && (
                  <span className="inline-block mt-2 text-sm text-green-300">
                    Confidence: {(ticket.confidenceScore * 100).toFixed(1)}%
                  </span>
                )}

                {Array.isArray(ticket.similarTickets) &&
                  ticket.similarTickets.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold">📋 Similar Past Cases:</h4>
                      <ul className="list-disc ml-5">
                        {ticket.similarTickets.map((t) => (
                          <li key={t._id || t}>
                            <a className="link link-primary" href={`/tickets/${t._id || t}`}> 
                              {t.title || "Similar ticket"}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
