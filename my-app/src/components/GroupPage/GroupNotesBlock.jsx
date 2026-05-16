import BorderGlow from "../Animation/BorderGlow";
import { USER, getIsMobileViewport, hexToRgba, normalizeHexColor } from "../../utils/groupPageUtils.jsx";

export function FloatingMenu({ x, y, children }) {
  return (
    <div
      data-note-ui="true"
      className="floating-menu"
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="floating-menu__inner">{children}</div>
    </div>
  );
}

export default function GroupNotesBlock({
  notesRevealRef,
  isNotesPanelVisible,
  notesPanelRef,
  notesDescription,
  notes,
  friendsWithColors,
  notesPanelScale,
  noteElementsRef,
  notesMenu,
  activeNoteMenu,
  isClearNotesConfirmOpen,
  onNotesBoardPointerDown,
  onNotesBoardPointerUp,
  onNotesBoardContextMenu,
  onNoteMouseDown,
  onNotePointerDown,
  onNotePointerMove,
  onNotePointerUp,
  onOpenNoteActions,
  onOpenNoteEditor,
  onRequestClearNotes,
  onDeleteNote,
  onCloseClearNotesConfirm,
  onConfirmClearNotes,
}) {
  return (
    <div
      ref={notesRevealRef}
      className={`group-notes-reveal ${isNotesPanelVisible ? "group-notes-reveal--visible" : ""}`}
    >
      <BorderGlow>
        <div
          ref={notesPanelRef}
          className="group-panel group-panel--notes"
          onPointerDown={onNotesBoardPointerDown}
          onPointerUp={onNotesBoardPointerUp}
          onContextMenu={onNotesBoardContextMenu}
          aria-label="Поле заметок группы"
        >
          <h2 className="section-title">Поле для заметок</h2>
          <p className="section-description">{notesDescription}</p>

          <div className="group-notes-layer">
            {notes.map((note) => {
              const noteAuthor =
                friendsWithColors.find((friend) => String(friend.backendMemberId) === String(note.authorMemberId)) ||
                friendsWithColors.find((friend) => friend.id === note.authorId) ||
                friendsWithColors[0] ||
                {
                  id: "unknown-note-author",
                  name: note.authorName || note.authorLogin || "Участник",
                  color: USER.avatarColor,
                };
              const noteAuthorColor = normalizeHexColor(noteAuthor?.color, USER.avatarColor);
              const noteAuthorName = noteAuthor?.name || "Участник";

              return (
                <button
                  key={note.id}
                  ref={(node) => {
                    if (node) {
                      noteElementsRef.current.set(note.id, node);
                    } else {
                      noteElementsRef.current.delete(note.id);
                    }
                  }}
                  type="button"
                  data-note-item="true"
                  className={`sticky-note ${note.dragging ? "sticky-note--dragging" : ""}`}
                  style={{
                    left: typeof note.x === "number" ? note.x : `${note.pinXPercent || 0}%`,
                    top: typeof note.y === "number" ? note.y : `${note.pinYPercent || 0}%`,
                    zIndex: note.dragging ? 200 : note.zIndex,
                    minHeight: Math.max(96, 96 + Math.floor(note.text.length / 42) * 22),
                    "--note-accent": noteAuthorColor,
                    "--note-accent-soft": hexToRgba(noteAuthorColor, 0.22),
                    "--note-tilt": `${note.tilt || 0}deg`,
                    "--note-peel-x": `${note.peelX || 0}px`,
                    "--note-peel-y": `${note.peelY || 0}px`,
                    "--note-scale": notesPanelScale,
                  }}
                  onMouseDown={(event) => onNoteMouseDown(event, note.id)}
                  onPointerDown={(event) => onNotePointerDown(event, note.id)}
                  onPointerMove={onNotePointerMove}
                  onPointerUp={onNotePointerUp}
                  onPointerCancel={onNotePointerUp}
                  onContextMenu={(event) => {
                    if (getIsMobileViewport()) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }

                    onOpenNoteActions(event, note.id);
                  }}
                  aria-label={`Записка от ${noteAuthorName}: ${note.text}`}
                  title={`Автор: ${noteAuthorName}`}
                >
                  {!note.dragging && <span className="sticky-note__pin" aria-hidden="true" />}
                  <span className="sticky-note__text">{note.text}</span>
                  <span className="sticky-note__fold" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          {notesMenu && (
            <FloatingMenu x={notesMenu.x} y={notesMenu.y}>
              <button type="button" data-note-ui="true" onClick={onOpenNoteEditor} className="menu-item">
                Написать записку
              </button>
              {notes.length > 0 && (
                <button
                  type="button"
                  data-note-ui="true"
                  onClick={onRequestClearNotes}
                  className="menu-item menu-item--danger"
                >
                  Очистить поле
                </button>
              )}
            </FloatingMenu>
          )}

          {activeNoteMenu && (
            <FloatingMenu x={activeNoteMenu.x} y={activeNoteMenu.y}>
              <button type="button" data-note-ui="true" onClick={onDeleteNote} className="menu-item menu-item--danger">
                Удалить записку
              </button>
            </FloatingMenu>
          )}
        </div>
      </BorderGlow>

      {isClearNotesConfirmOpen && (
        <div className="modal-backdrop" data-note-ui="true" onClick={onCloseClearNotesConfirm}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__title">Очистить поле?</div>
            <div className="modal-card__text">
              Вы точно хотите удалить все записки с поля? Это действие очистит только записки на текущей странице группы.
            </div>

            <div className="modal-card__actions">
              <button type="button" className="modal-card__button modal-card__button--ghost" onClick={onCloseClearNotesConfirm}>
                Отмена
              </button>
              <button type="button" className="modal-card__button modal-card__button--danger" onClick={onConfirmClearNotes}>
                Очистить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
