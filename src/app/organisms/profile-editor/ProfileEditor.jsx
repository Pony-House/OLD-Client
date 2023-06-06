import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { colorMXID } from '../../../util/colorMXID';

import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import ImageUpload from '../../molecules/image-upload/ImageUpload';
import Input from '../../atoms/input/Input';

import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import './ProfileEditor.scss';

function ProfileEditor({ userId }) {

  // Values
  const [isEditing, setIsEditing] = useState(false);
  const mx = initMatrix.matrixClient;
  const user = mx.getUser(mx.getUserId());

  // Config Base
  const displayNameRef = useRef(null);
  const spaceProfileRef = useRef(null);
  const [avatarSrc, setAvatarSrc] = useState(user.avatarUrl ? mx.mxcUrlToHttp(user.avatarUrl) : null);
  const [username, setUsername] = useState(user.displayName);
  const [disabled, setDisabled] = useState(true);

  // Profile Base
  const profileSetting = mx.getAccountData('pony.house.profile');
  const [profileId, setProfileId] = useState(null);
  if (profileSetting && typeof profileSetting.roomId === 'string') { setProfileId(profileSetting.roomId); }

  console.log(profileSetting);

  // User Effect
  useEffect(() => {

    let isMounted = true;
    mx.getProfileInfo(mx.getUserId()).then((info) => {
      if (!isMounted) return;
      setAvatarSrc(info.avatar_url ? mx.mxcUrlToHttp(info.avatar_url) : null);
      setUsername(info.displayname);
    });

    if (user) {
      const newProfSetting = mx.getAccountData('pony.house.profile');
      if (newProfSetting && typeof newProfSetting.roomId === 'string') { setProfileId(newProfSetting.roomId); } else {
        setProfileId(null);
      }
    }

    return () => {
      isMounted = false;
    };

  }, [userId, user]);

  // Avatar Upload
  const handleAvatarUpload = async (url) => {
    if (url === null) {
      const isConfirmed = await confirmDialog(
        'Remove avatar',
        'Are you sure that you want to remove avatar?',
        'Remove',
        'warning',
      );
      if (isConfirmed) {
        mx.setAvatarUrl('');
        setAvatarSrc(null);
      }
      return;
    }
    mx.setAvatarUrl(url);
    setAvatarSrc(mx.mxcUrlToHttp(url));
  };

  // Display Name
  const saveDisplayName = () => {
    const newDisplayName = displayNameRef.current.value;
    if (newDisplayName !== null && newDisplayName !== username) {
      mx.setDisplayName(newDisplayName);
      setUsername(newDisplayName);
      setDisabled(true);
      setIsEditing(false);
    }
  };

  const onDisplayNameInputChange = () => {
    setDisabled(username === displayNameRef.current.value || displayNameRef.current.value == null);
  };
  const cancelDisplayNameChanges = () => {
    displayNameRef.current.value = username;
    onDisplayNameInputChange();
    setIsEditing(false);
  };

  // Render
  const renderForm = () => (
    <form
      className="profile-editor__form"
      style={{ marginBottom: avatarSrc ? '24px' : '0' }}
      onSubmit={(e) => { e.preventDefault(); saveDisplayName(); }}
    >
      <div>
        <Input
          label={`Display name of ${mx.getUserId()}`}
          onChange={onDisplayNameInputChange}
          value={mx.getUser(mx.getUserId()).displayName}
          forwardRef={displayNameRef}
        />
      </div>
      <Button variant="primary" type="submit" disabled={disabled}>Save</Button>
      <Button onClick={cancelDisplayNameChanges}>Cancel</Button>
    </form>
  );

  const renderInfo = () => (
    <div className="profile-editor__info" style={{ marginBottom: avatarSrc ? '24px' : '0' }}>
      <div>
        <div className='h5 emoji-size-fix'>{twemojify(username) ?? userId}</div>
        <IconButton
          fa="fa-solid fa-pencil"
          size="extra-small"
          tooltip="Edit"
          onClick={() => setIsEditing(true)}
        />
      </div>
      <div className='small'>{mx.getUserId()}</div>
      <div ref={spaceProfileRef} className='very-small'>{profileId || <Button className='mt-2 btn-sm' variant='primary' onClick={() => {
        mx.createRoom({
          name: `Pony-House -> ${userId}'s Profile`,
          creation_content: { type: 'm.space' },
          visibility: 'private',
          preset: 'public_chat',
        }).then(data => {
          mx.setAccountData('pony.house.profile', { roomId: data.room_id });
          setProfileId(data.room_id);
        });
      }}>Create Profile</Button>
      }</div>
    </div>
  );

  // Complete
  return (
    <div className="profile-editor pb-3">
      <ImageUpload
        text={username ?? userId}
        bgColor={colorMXID(userId)}
        imageSrc={avatarSrc}
        onUpload={handleAvatarUpload}
        onRequestRemove={() => handleAvatarUpload(null)}
      />
      {
        isEditing ? renderForm() : renderInfo()
      }
    </div>
  );

}

ProfileEditor.defaultProps = {
  userId: null,
};

ProfileEditor.propTypes = {
  userId: PropTypes.string,
};

export default ProfileEditor;
