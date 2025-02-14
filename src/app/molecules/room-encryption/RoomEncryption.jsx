import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './RoomEncryption.scss';

import initMatrix from '../../../client/initMatrix';

import Toggle from '../../atoms/button/Toggle';
import SettingTile from '../setting-tile/SettingTile';

import { confirmDialog } from '../confirm-dialog/ConfirmDialog';

function RoomEncryption({ roomId }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const encryptionEvents = room.currentState.getStateEvents('m.room.encryption');
  const [isEncrypted, setIsEncrypted] = useState(encryptionEvents.length > 0);
  const canEnableEncryption = room.currentState.maySendStateEvent('m.room.encryption', mx.getUserId());

  const handleEncryptionEnable = async () => {
    const joinRule = room.getJoinRule();
    const confirmMsg1 = 'It is not recommended to add encryption in public room. Anyone can find and join public rooms, so anyone can read messages in them.';
    const confirmMsg2 = 'Once enabled, encryption for a room cannot be disabled. Messages sent in an encrypted room cannot be seen by the server, only by the participants of the room. Enabling encryption may prevent many bots and bridges from working correctly';

    const isConfirmed1 = (joinRule === 'public')
      ? await confirmDialog('Enable encryption', confirmMsg1, 'Continue', 'warning')
      : true;
    if (!isConfirmed1) return;
    if (await confirmDialog('Enable encryption', confirmMsg2, 'Enable', 'warning')) {
      setIsEncrypted(true);
      mx.sendStateEvent(roomId, 'm.room.encryption', {
        algorithm: 'm.megolm.v1.aes-sha2',
      });
    }
  };

  return (
    <SettingTile
      title="Enable room encryption"
      content={(
        <div className="very-small text-gray">Once enabled, encryption cannot be disabled.</div>
      )}
      options={(
        <Toggle
          className='d-inline-flex'
          isActive={isEncrypted}
          onToggle={handleEncryptionEnable}
          disabled={isEncrypted || !canEnableEncryption}
        />
      )}
    />
  );
}

RoomEncryption.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomEncryption;
