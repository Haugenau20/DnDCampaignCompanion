// src/features/user-management/profiles/components/CharactersCard.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import Input from "core/components/Input";
import Button from "core/components/Button";
import Card from "core/components/Card";
import { PlusCircle, AlertCircle } from "lucide-react";
import { useCharacterRoster } from "../hooks/useCharacterRoster";
import CharacterRow from "./CharacterRow";

/**
 * Characters section of the profile page: the character list (each row owning
 * its own rename, removal confirmation and error) and the add row.
 *
 * Only one row can be mid-rename at a time -- `renamingId` here is the single
 * source of truth for which one, so starting a rename on a different row
 * automatically leaves the previous one. The add row at the bottom is
 * entirely independent of that state: it keeps its own input and its own
 * error (`addError`), and renaming never reaches into it.
 */
const CharactersCard: React.FC = () => {
  const { characters, activeCharacterId, saving, rowErrors, addError, add, rename, remove, setActive } =
    useCharacterRoster();

  const [newCharacterName, setNewCharacterName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const success = await add(newCharacterName);
    if (success) setNewCharacterName("");
  };

  const handleStartRename = (id: string) => setRenamingId(id);

  const handleCancelRename = () => setRenamingId(null);

  const handleConfirmRename = async (id: string, name: string) => {
    const success = await rename(id, name);
    if (success) setRenamingId(null);
  };

  return (
    <Card>
      <Card.Content className="space-y-3">
        {/* No "Active Character" block here. The group card states who you are
            posting as, and each row below carries its own star and marker --
            three places saying one thing is what this redesign removed. */}
        <Typography id="characters-heading" variant="h4">Characters</Typography>
        {characters.length > 0 ? (
          <div className="space-y-2">
            {characters.map((character) => (
              <CharacterRow
                key={character.id}
                character={character}
                isActive={character.id === activeCharacterId}
                isRenaming={renamingId === character.id}
                renameDisabled={renamingId !== null && renamingId !== character.id}
                saving={saving}
                error={rowErrors[character.id]}
                onSetActive={() => setActive(character.id)}
                onStartRename={() => handleStartRename(character.id)}
                onConfirmRename={(name) => handleConfirmRename(character.id, name)}
                onCancelRename={handleCancelRename}
                onRemove={() => remove(character.id)}
              />
            ))}
          </div>
        ) : (
          <div className="py-2 px-3 rounded-md text-center bg-secondary">
            <Typography color="secondary">No character names added yet</Typography>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Add a character…"
            value={newCharacterName}
            onChange={(e) => setNewCharacterName(e.target.value)}
            disabled={saving}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            startIcon={<PlusCircle size={16} />}
            disabled={!newCharacterName.trim() || saving}
            isLoading={saving}
          >
            Add
          </Button>
        </div>

        {addError && (
          <div className="flex items-center gap-2 form-error">
            <AlertCircle size={16} />
            <Typography color="error">{addError}</Typography>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default CharactersCard;
