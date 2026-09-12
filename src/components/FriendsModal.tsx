import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Copy,
  Check,
  Trash2,
  Calendar,
  X,
  Sparkles,
  Loader2,
  UserCheck,
  Clock,
} from 'lucide-react';
import { FriendUser, ThemeConfig } from '../types';
import {
  UserProfileData,
  searchUserByEmailOrUid,
  addFriendToFirestore,
  removeFriendFromFirestore,
  getDiscoverableUsers,
} from '../services/firestoreService';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  friends: FriendUser[];
  onSelectFriendToView: (friend: FriendUser) => void;
  onCompareWithFriend: (friend: FriendUser) => void;
  onGoogleSignIn: () => void;
  theme: ThemeConfig;
  showToast: (msg: string) => void;
  initialSearchTerm?: string;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  friends,
  onSelectFriendToView,
  onCompareWithFriend,
  onGoogleSignIn,
  theme,
  showToast,
  initialSearchTerm = '',
}) => {
  const [searchInput, setSearchInput] = useState(initialSearchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfileData | null>(null);
  const [searchError, setSearchError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [discoverableUsers, setDiscoverableUsers] = useState<UserProfileData[]>([]);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchInput(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Load discoverable users when modal opens and user is logged in
  useEffect(() => {
    if (isOpen && currentUser) {
      setIsLoadingDiscover(true);
      getDiscoverableUsers(currentUser.uid)
        .then((users) => {
          setDiscoverableUsers(users);
        })
        .catch((err) => {
          console.warn('Load discoverable error:', err);
        })
        .finally(() => {
          setIsLoadingDiscover(false);
        });
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.uid);
    setCopiedCode(true);
    showToast('คัดลอกรหัสเพื่อน (Friend Code) เรียบร้อยแล้ว');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!currentUser) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?add_friend=${currentUser.uid}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('คัดลอกลิงก์แอดเพื่อนเรียบร้อยแล้ว');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    if (currentUser && (query === currentUser.email || query === currentUser.uid)) {
      setSearchError('ไม่สามารถแอดตัวเองเป็นเพื่อนได้');
      setSearchResult(null);
      return;
    }

    // Check if already friends
    const alreadyFriend = friends.find(
      (f) => f.friendUid === query || f.email.toLowerCase() === query.toLowerCase()
    );
    if (alreadyFriend) {
      setSearchError(`เป็นเพื่อนกับ "${alreadyFriend.displayName || alreadyFriend.email}" อยู่แล้ว`);
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const user = await searchUserByEmailOrUid(query);
      if (user) {
        if (currentUser && user.uid === currentUser.uid) {
          setSearchError('ไม่สามารถแอดตัวเองเป็นเพื่อนได้');
        } else {
          setSearchResult(user);
        }
      } else {
        setSearchError('ไม่พบผู้ใช้งานด้วยอีเมลหรือรหัสนี้');
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (userToAdd: UserProfileData) => {
    if (!currentUser) return;
    setIsAdding(true);
    try {
      const newFriend: FriendUser = {
        friendUid: userToAdd.uid,
        email: userToAdd.email,
        displayName: userToAdd.displayName || userToAdd.email.split('@')[0],
        photoURL: userToAdd.photoURL || '',
        themeId: userToAdd.themeId || 'minimal',
        addedAt: new Date().toISOString(),
      };

      await addFriendToFirestore(currentUser.uid, newFriend);
      showToast(`เพิ่ม "${newFriend.displayName}" เป็นเพื่อนเรียบร้อยแล้ว!`);
      setSearchResult(null);
      setSearchInput('');
      setSearchError('');
    } catch (err) {
      console.error('Add friend error:', err);
      showToast('ไม่สามารถเพิ่มเพื่อนได้ในขณะนี้');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFriend = async (friend: FriendUser) => {
    if (!currentUser) return;
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${friend.displayName}" ออกจากรายชื่อเพื่อน?`)) {
      try {
        await removeFriendFromFirestore(currentUser.uid, friend.friendUid);
        showToast(`ลบ "${friend.displayName}" ออกจากรายชื่อเพื่อนแล้ว`);
      } catch (err) {
        console.error('Remove friend error:', err);
        showToast('ไม่สามารถลบเพื่อนได้');
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="friends-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-xl flex flex-col max-h-[90vh] ${theme.cardBg} ${theme.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
              style={{ backgroundColor: theme.accentColor || '#1c1917' }}
            >
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="friends-modal-title" className="text-base font-bold text-stone-900">
                ระบบเพื่อนและดูตารางนัดหมาย
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {/* If NOT signed in with Google/Firebase */}
          {!currentUser ? (
            <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-200/80 flex items-center justify-center text-stone-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-800">
                  เข้าสู่ระบบเพื่อเริ่มใช้งานระบบเพื่อน
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  เข้าสู่ระบบด้วย Google เพื่อรับรหัสเพื่อน และสามารถค้นหา แอดเพื่อน และเปิดดูตาราง 3 ช่วงเวลาของเพื่อนได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoogleSignIn();
                }}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-medium text-xs shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>เข้าสู่ระบบด้วย Google</span>
              </button>
            </div>
          ) : (
            <>
              {/* User's Friend Code & Sharing Card */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                    ข้อมูลเพื่อนของคุณ
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    พร้อมแชร์ตาราง
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Profile'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-stone-300 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-700 shrink-0">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {currentUser.displayName || 'ผู้ใช้งาน'}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate">{currentUser.email}</p>
                    <p className="text-[10px] font-mono text-stone-400 truncate">
                      ID: {currentUser.uid}
                    </p>
                  </div>
                </div>

                {/* Quick copy buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-stone-400" />
                    )}
                    <span>{copiedCode ? 'คัดลอกรหัสแล้ว' : 'คัดลอกรหัสเพื่อน'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span>{copiedLink ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์แอดเพื่อน'}</span>
                  </button>
                </div>
              </div>

              {/* Add Friend Form */}
              <div className="space-y-2">
                <label
                  htmlFor="friend-search-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  ค้นหาและเพิ่มเพื่อน (ด้วยอีเมล หรือ รหัสเพื่อน)
                </label>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="friend-search-input"
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="เช่น friend@gmail.com หรือ รหัสเพื่อน"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden focus:border-stone-800 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-black disabled:bg-stone-300 text-white font-medium text-xs shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isSearching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>ค้นหา</span>
                  </button>
                </form>

                {/* Error message */}
                {searchError && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                    {searchError}
                  </p>
                )}

                {/* Search Result Card */}
                {searchResult && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {searchResult.photoURL ? (
                        <img
                          src={searchResult.photoURL}
                          alt={searchResult.displayName || searchResult.email}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full border border-emerald-300 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {(searchResult.displayName || searchResult.email || 'F')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-950 truncate">
                          {searchResult.displayName || searchResult.email.split('@')[0]}
                        </p>
                        <p className="text-[11px] text-emerald-700 truncate">
                          {searchResult.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={() => handleAddFriend(searchResult)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-medium text-xs shadow-2xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {isAdding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      <span>เพิ่มเพื่อน</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Friends List */}
              <div className="space-y-2.5 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-stone-500" />
                    <span>รายชื่อเพื่อนของฉัน ({friends.length})</span>
                  </h3>
                  {friends.length > 0 && (
                    <span className="text-[11px] text-stone-400">
                      คลิกดูตารางเพื่อเปิดดูนัดหมาย 3 ช่วงเวลา
                    </span>
                  )}
                </div>

                {friends.length === 0 ? (
                  <div className="p-5 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center space-y-2">
                    <p className="text-xs text-stone-600 font-medium">ยังไม่มีเพื่อนในรายชื่อ</p>
                    <p className="text-[11px] text-stone-400">
                      ค้นหาด้วยอีเมลของเพื่อนด้านบน หรือส่งลิงก์แอดเพื่อนให้เพื่อนของคุณได้ทันที
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.friendUid}
                        className="p-3 rounded-xl bg-white hover:bg-stone-50/80 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {friend.photoURL ? (
                            <img
                              src={friend.photoURL}
                              alt={friend.displayName}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-full border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {(friend.displayName || friend.email || 'F')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-stone-900 truncate">
                              {friend.displayName}
                            </h4>
                            <p className="text-[11px] text-stone-500 truncate">{friend.email}</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectFriendToView(friend);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-medium shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="เปิดดูปฏิทินและตารางนัดหมายของเพื่อนคนนี้"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>ดูตาราง</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onCompareWithFriend(friend);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium border border-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title="เปรียบเทียบช่วงเวลาว่างร่วมกัน 3 ช่วงเวลา"
                          >
                            <Clock className="w-3.5 h-3.5 text-stone-500" />
                            <span>เทียบเวลาว่าง</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(friend)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="ลบเพื่อน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestions / Discoverable users from Firestore */}
                {discoverableUsers.length > 0 && (
                  <div className="pt-3 border-t border-stone-200 space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>ผู้ใช้ที่ลงทะเบียนในระบบ (คลิกเพื่อเพิ่มเพื่อนได้ทันที)</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {discoverableUsers
                        .filter(
                          (u) => !friends.some((f) => f.friendUid === u.uid)
                        )
                        .slice(0, 4)
                        .map((u) => (
                          <div
                            key={u.uid}
                            className="p-2 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-stone-800 truncate">
                                {u.displayName || u.email.split('@')[0]}
                              </p>
                              <p className="text-[10px] text-stone-400 truncate">{u.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddFriend(u)}
                              className="px-2 py-1 rounded-md bg-stone-900 hover:bg-black text-white text-[10px] font-medium shrink-0 cursor-pointer"
                            >
                              + เพิ่ม
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-200 flex items-center justify-end bg-stone-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-medium transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
