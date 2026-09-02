// src/features/user-management/profiles/components/CharactersCard.tsx
import React, { useState } from "react";
import Typography from "core/components/Typography";
import Input from "core/components/Input";
import Button from "core/components/Button";
import Card from "core/components/Card";
import { Check, X, PlusCircle, Star, AlertCircle } from "lucide-react";
import { useCharacterRoster } from "../hooks/useCharacterRoster";
import CharacterRow from "./CharacterRow";

/**
 * Characters section of the profile page: the active-character display, the
 * add/rename input row, and the character list.
 *
 * A behaviour-preserving extraction of the "Active Character Display" and
 * "Character Names" blocks that used to sit inline in `UserProfile.tsx`,
 * now over {@link useCharacterRoster}. Renaming still hijacks this shared
 * input the way the original component did -- that changes in a later
 * change, alongside per-row error display.
 */
const CharactersCard: React.FC = () => {
  const { characters, activeCharacterId, saving, rowErrors, addError, add, rename, remove, setActive } =
    useCharacterRoster();

  const [newCharacterName, setNewCharacterName] = useState("");
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);

  const activeCharacter = characters.find((char) => char.id === activeCharacterId);
  const activeDisplayName = activeCharacter ? activeCharacter.name : null;

  const handleAdd = async () => {
    const success = await add(newCharacterName);
    if (success) setNewCharacterName("");
  };

  const handleStartEdit = (id: string) => {
    const character = characters.find((c) => c.id === id);
    if (character) {
      setNewCharacterName(character.name);
      setEditingCharacterId(id);
    }
  };

  const handleConfirmEdit = async () => {
    if (!editingCharacterId) return;
    const success = await rename(editingCharacterId, newCharacterName);
    if (success) {
      setNewCharacterName("");
      setEditingCharacterId(null);
    }
  };

  const handleCancelEdit = () => {
    setNewCharacterName("");
    setEditingCharacterId(null);
  };

  return (
    <Card>
      <Card.Content className="space-y-3">
        <div className="space-y-2">
          <Typography variant="body-sm" color="secondary">Active Character</Typography>
          <div className="p-3 rounded-lg bg-secondary">
            {activeDisplayName ? (
              <div className="flex items-center">
                <Star size={16} className="mr-2 accent" />
                <Typography>{activeDisplayName}</Typography>
              </div>
            ) : (
              <Typography color="secondary">
                No active character selected. Actions will use your username.
              </Typography>
            )}
          </div>
        </div>

        <Typography id="characters-heading" variant="h4">Characters</Typography>
        <Typography variant="body-sm" color="secondary">
          The one marked &apos;posting as&apos; is used when you create content in this group.
        </Typography>

        <div className="flex gap-2">
          <Input
            placeholder={editingCharacterId ? "Edit character..." : "Add new character..."}
            value={newCharacterName}
            onChange={(e) => setNewCharacterName(e.target.value)}
            disabled={saving}
            className="flex-1"
          />

          {editingCharacterId ? (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                startIcon={<X size={16} />}
                disabled={saving}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmEdit}
                startIcon={<Check size={16} />}
                disabled={!newCharacterName.trim() || saving}
                isLoading={saving}
              />
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleAdd}
              startIcon={<PlusCircle size={16} />}
              disabled={!newCharacterName.trim() || saving}
              isLoading={saving}
            >
              Add
            </Button>
          )}
        </div>

        {addError && (
          <div className="flex items-center gap-2 form-error">
            <AlertCircle size={16} />
            <Typography color="error">{addError}</Typography>
          </div>
        )}

        {characters.length > 0 ? (
          <div className="space-y-2 mt-3">
            {characters.map((character) => (
              <div key={character.id} className="space-y-1">
                <CharacterRow
                  character={character}
                  isActive={character.id === activeCharacterId}
                  isEditingOther={editingCharacterId !== null && editingCharacterId !== character.id}
                  saving={saving}
                  onSetActive={() => setActive(character.id)}
                  onEdit={() => handleStartEdit(character.id)}
                  onDelete={() => remove(character.id)}
                />
                {rowErrors[character.id] && (
                  <div className="flex items-center gap-2 form-error">
                    <AlertCircle size={16} />
                    <Typography color="error">{rowErrors[character.id]}</Typography>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-2 px-3 rounded-md text-center bg-secondary">
            <Typography color="secondary">No character names added yet</Typography>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default CharactersCard;
