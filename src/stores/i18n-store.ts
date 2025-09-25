'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'vi';

type Dictionary = Record<string, { en: string; vi: string }>;

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const store: Dictionary = {
  // Common
  'common.back': { en: 'Back', vi: 'Quay lại' },
  'common.cancel': { en: 'Cancel', vi: 'Huỷ' },
  'common.create': { en: 'Create', vi: 'Tạo' },
  'common.update': { en: 'Update', vi: 'Cập nhật' },
  'common.save': { en: 'Save', vi: 'Lưu' },
  'common.saving': { en: 'Saving', vi: 'Đang lưu' },
  'common.delete': { en: 'Delete', vi: 'Xoá' },
  'common.edit': { en: 'Edit', vi: 'Sửa' },
  'common.loading': { en: 'Loading...', vi: 'Đang tải...' },
  'common.email': { en: 'Email', vi: 'Email' },
  'common.password': { en: 'Password', vi: 'Mật khẩu' },
  'common.fullName': { en: 'Full Name', vi: 'Họ và tên' },
  'common.retry': { en: 'Try Again', vi: 'Thử lại' },
  'common.fullNamePlaceholder': { en: 'Enter your full name', vi: 'Nhập họ và tên của bạn' },
  'common.signIn': { en: 'Sign In', vi: 'Đăng nhập' },
  'common.signUp': { en: 'Sign Up', vi: 'Đăng ký' },
  'common.signOut': { en: 'Sign Out', vi: 'Đăng xuất' },
  'common.title': { en: 'Title', vi: 'Tiêu đề' },
  'common.name': { en: 'Name', vi: 'Tên' },
  'common.copyrightSuffix': { en: 'All rights reserved.', vi: 'Đã đăng ký bản quyền.' },
  'common.role': { en: 'Role', vi: 'Vai trò' },
  'common.role.admin': { en: 'Admin', vi: 'Quản trị viên' },
  'common.role.user': { en: 'User', vi: 'Người dùng' },

  // Navigation
  'nav.articles': { en: 'Articles', vi: 'Bài viết' },
  'nav.admin': { en: 'Admin', vi: 'Quản trị viên' },
  'nav.editProfile': { en: 'Edit Profile', vi: 'Chỉnh sửa hồ sơ' },
  'nav.language': { en: 'Language', vi: 'Ngôn ngữ' },

  // Auth Modal
  'auth.welcomeBack': { en: 'Welcome back', vi: 'Chào mừng trở lại' },
  'auth.createAccount': { en: 'Create an account', vi: 'Tạo tài khoản' },
  'auth.signInDescription': {
    en: 'Sign in to your account to continue',
    vi: 'Đăng nhập vào tài khoản để tiếp tục',
  },
  'auth.signUpDescription': {
    en: 'Enter your details to create a new account',
    vi: 'Nhập thông tin để tạo tài khoản mới',
  },
  'auth.continueWithGoogle': { en: 'Continue with Google', vi: 'Tiếp tục với Google' },
  'auth.orContinueWith': { en: 'Or continue with', vi: 'Hoặc tiếp tục với' },
  'auth.fullNamePlaceholder': { en: 'Enter your full name', vi: 'Nhập họ và tên của bạn' },
  'auth.emailPlaceholder': { en: 'Enter your email', vi: 'Nhập email của bạn' },
  'auth.passwordPlaceholder': { en: 'Enter your password', vi: 'Nhập mật khẩu của bạn' },
  'auth.confirmPassword': { en: 'Confirm Password', vi: 'Xác nhận mật khẩu' },
  'auth.confirmPasswordPlaceholder': {
    en: 'Confirm your password',
    vi: 'Xác nhận mật khẩu của bạn',
  },
  'auth.available': { en: 'Available', vi: 'Hợp lệ' },
  'auth.taken': { en: 'Taken', vi: 'Đã được sử dụng' },
  'auth.passwordsMatch': { en: 'Passwords match', vi: 'Mật khẩu khớp' },
  'auth.passwordsDoNotMatch': { en: 'Passwords do not match', vi: 'Mật khẩu không khớp' },
  'auth.signingIn': { en: 'Signing in...', vi: 'Đang đăng nhập...' },
  'auth.creatingAccount': { en: 'Creating account...', vi: 'Đang tạo tài khoản...' },
  'auth.dontHaveAccount': { en: "Don't have an account?", vi: 'Chưa có tài khoản?' },
  'auth.alreadyHaveAccount': { en: 'Already have an account?', vi: 'Đã có tài khoản?' },
  'auth.signInLink': { en: 'Sign in', vi: 'Đăng nhập' },
  'auth.fillAllFields': { en: 'Please fill in all fields', vi: 'Vui lòng điền đầy đủ thông tin' },
  'auth.passwordsDoNotMatchError': { en: 'Passwords do not match', vi: 'Mật khẩu không khớp' },
  'auth.passwordTooShort': {
    en: 'Password must be at least 8 characters long',
    vi: 'Mật khẩu phải có ít nhất 8 ký tự',
  },
  'auth.passwordValid': {
    en: 'Valid',
    vi: 'Hợp lệ',
  },
  'auth.invalidEmail': {
    en: 'Invalid email',
    vi: 'Email không hợp lệ',
  },
  'auth.validEmail': {
    en: 'Valid email',
    vi: 'Email hợp lệ',
  },
  'auth.emailTaken': { en: 'Email is already taken', vi: 'Email đã được sử dụng' },
  'auth.loginSuccessful': { en: 'Login successful!', vi: 'Đăng nhập thành công!' },
  'auth.loginFailed': { en: 'Login failed', vi: 'Đăng nhập thất bại' },
  'auth.registrationFailed': { en: 'Registration failed', vi: 'Đăng ký thất bại' },
  'auth.googleLoginFailed': { en: 'Google login failed', vi: 'Đăng nhập Google thất bại' },
  'auth.emailCheckFailed': {
    en: 'Failed to check email availability',
    vi: 'Không thể kiểm tra email',
  },

  // Chat
  'chat.title': { en: 'Chat', vi: 'Trò chuyện' },
  'chat.online': { en: 'Online', vi: 'Trực tuyến' },
  'chat.offline': { en: 'Offline', vi: 'Ngoại tuyến' },
  'chat.loadingMessages': { en: 'Loading messages...', vi: 'Đang tải tin nhắn...' },
  'chat.loadMore': { en: 'Load More Messages', vi: 'Tải thêm tin nhắn' },
  'chat.typeMessage': { en: 'Type a message...', vi: 'Nhập tin nhắn...' },
  'chat.findConversation': { en: 'Find a conversation...', vi: 'Tìm cuộc trò chuyện...' },
  'chat.noConversation': { en: 'No conversation found', vi: 'Không có cuộc trò chuyện' },
  'chat.send': { en: 'Send', vi: 'Gửi' },
  'chat.sendMessage': { en: 'Send Message', vi: 'Gửi tin nhắn' },

  // Articles
  'articles.my': { en: 'My Articles', vi: 'Bài viết của tôi' },
  'articles.latest': { en: 'Latest Articles', vi: 'Bài viết mới nhất' },
  'articles.all': { en: 'All Articles', vi: 'Tất cả bài viết' },
  'articles.total': { en: 'Articles', vi: 'Bài viết' },
  'articles.allCategories': { en: 'All Categories', vi: 'Tất cả danh mục' },
  'articles.manageIntro': {
    en: 'Manage your articles and share your knowledge',
    vi: 'Quản lý bài viết và chia sẻ kiến thức của bạn',
  },
  'articles.new': { en: 'New Article', vi: 'Bài viết mới' },
  'articles.searchPlaceholder': {
    en: 'Search your articles...',
    vi: 'Tìm bài viết của bạn...',
  },
  'articles.sort.title': { en: 'Title', vi: 'Tiêu đề' },
  'articles.sort.created': { en: 'Created', vi: 'Ngày tạo' },
  'articles.sort.updated': { en: 'Updated', vi: 'Ngày cập nhật' },
  'articles.published': { en: 'Published', vi: 'Đã xuất bản' },
  'articles.draft': { en: 'Draft', vi: 'Bản nháp' },
  'articles.menu.publish': { en: 'Publish', vi: 'Xuất bản' },
  'articles.menu.unpublish': { en: 'Unpublish', vi: 'Gỡ xuất bản' },
  'articles.menu.preview': { en: 'Preview', vi: 'Xem thử' },
  'articles.menu.view': { en: 'View', vi: 'Xem' },
  'articles.form.createNew': { en: 'Create New Article', vi: 'Tạo bài viết mới' },
  'articles.form.title': { en: 'Title', vi: 'Tiêu đề' },
  'articles.form.slug': { en: 'Slug', vi: 'Slug' },
  'articles.form.titlePlaceholder': { en: 'Enter article title', vi: 'Nhập tiêu đề bài viết' },
  'articles.form.slugPlaceholder': { en: 'article-slug', vi: 'bai-viet-slug' },
  'articles.form.thumbnail': { en: 'Thumbnail', vi: 'Ảnh đại diện' },
  'articles.form.clickToUpload': {
    en: 'Click to upload thumbnail',
    vi: 'Nhấn để tải ảnh đại diện',
  },
  'articles.form.thumbHint': {
    en: 'PNG, JPG, GIF, WebP up to 5MB',
    vi: 'PNG, JPG, GIF, WebP tối đa 5MB',
  },
  'articles.form.category': { en: 'Category', vi: 'Danh mục' },
  'articles.form.selectCategory': { en: 'Select a category', vi: 'Chọn danh mục' },
  'articles.form.content': { en: 'Content', vi: 'Nội dung' },
  'articles.form.publishNow': { en: 'Publish immediately', vi: 'Xuất bản ngay' },

  // Profile
  'profile.notFound': { en: 'Profile not found', vi: 'Không tìm thấy hồ sơ' },
  'profile.yourProfile': { en: 'Your Profile', vi: 'Hồ sơ của bạn' },
  'profile.userProfile': { en: 'User Profile', vi: 'Hồ sơ người dùng' },
  'profile.settings': { en: 'Profile Settings', vi: 'Cài đặt hồ sơ' },
  'profile.manageIntro': {
    en: 'Manage your account information and preferences',
    vi: 'Quản lý thông tin tài khoản và tuỳ chọn của bạn',
  },
  'profile.emailAddress': { en: 'Email Address', vi: 'Địa chỉ Email' },
  'profile.updated': { en: 'Profile updated successfully', vi: 'Cập nhật hồ sơ thành công' },
  'profile.totalArticles': { en: 'Total Articles', vi: 'Tổng số bài viết' },
  'profile.totalComments': { en: 'Total Comments', vi: 'Tổng bình luận' },
  'profile.totalLikes': { en: 'Total Likes', vi: 'Tổng lượt thích' },
  'profile.totalDislikes': { en: 'Total Dislikes', vi: 'Tổng lượt không thích' },
  'profile.accessLevel': { en: 'Access level', vi: 'Quyền truy cập' },
  'profile.memberSince': { en: 'Member since', vi: 'Thời gian gia nhập' },
  'profile.upload': { en: 'Upload', vi: 'Tải lên' },

  // Admin
  'admin.accessDenied': {
    en: 'Access denied. Admin privileges required.',
    vi: 'Truy cập bị từ chối. Cần quyền quản trị.',
  },
  'admin.panel': { en: 'Admin Panel', vi: 'Trang quản trị' },
  'admin.userManagement': { en: 'User Management', vi: 'Quản lý người dùng' },
  'admin.showing': { en: 'Showing:', vi: 'Hiển thị:' },
  'admin.usersAbbrev': { en: 'user(s)', vi: 'người dùng' },
  'admin.onPage': { en: 'on page', vi: 'ở trang' },
  'admin.of': { en: 'of', vi: 'trên' },
  'admin.totalSuffix': { en: 'total', vi: 'tổng' },
  'admin.sort.name': { en: 'Name', vi: 'Tên' },
  'admin.sort.joined': { en: 'Joined', vi: 'Ngày tham gia' },
  'admin.searchPlaceholder': {
    en: 'Search by name or email...',
    vi: 'Tìm theo tên hoặc email...',
  },
  'admin.table.role': { en: 'Role', vi: 'Vai trò' },
  'admin.table.joined': { en: 'Joined', vi: 'Ngày tham gia' },
  'admin.page': { en: 'Page', vi: 'Trang' },
  'admin.usersPerPage': { en: 'users per page', vi: 'người dùng mỗi trang' },
  'admin.previous': { en: 'Previous', vi: 'Trước' },
  'admin.next': { en: 'Next', vi: 'Sau' },
  'admin.categories': { en: 'Categories', vi: 'Danh mục' },
  'admin.categoriesManagement': { en: 'Categories Management', vi: 'Quản lý danh mục' },
  'admin.newCategory': { en: 'New Category', vi: 'Danh mục mới' },
  'admin.rootCategory': { en: 'Root Category', vi: 'Danh mục gốc' },
  'admin.subCategories': { en: 'Sub categories', vi: 'Danh mục con' },
  'admin.createdBy': { en: 'Created by', vi: 'Tạo bởi' },

  // Homepage
  'home.searchPlaceholder': {
    en: 'Search articles, author or email...',
    vi: 'Tìm bài viết, tác giả hoặc email...',
  },
  'home.myArticles': { en: 'My Articles', vi: 'Bài viết của tôi' },
  'home.clearFilters': { en: 'Clear Filters', vi: 'Xoá bộ lọc' },
  'home.latestArticles': { en: 'Latest Articles', vi: 'Bài viết mới nhất' },
  'home.tagline': {
    en: 'Fresh insights from the Vietnamese developer community',
    vi: 'Góc nhìn mới từ cộng đồng lập trình viên Việt Nam',
  },
  'home.noMore': { en: 'No more articles to show', vi: 'Không còn bài viết để hiển thị' },

  // Leaderboard
  'leaderboard.title': { en: 'Leaderboard', vi: 'Bảng xếp hạng' },
  'leaderboard.subtitle': {
    en: 'See the most active members in the community',
    vi: 'Xem những thành viên tích cực nhất trong cộng đồng',
  },
  'leaderboard.tryAgain': { en: 'Try Again', vi: 'Thử lại' },
  'leaderboard.noData': {
    en: 'No data available for this timeframe',
    vi: 'Không có dữ liệu cho khoảng thời gian này',
  },

  // Comments/Article Content
  'comments.showReplies': { en: 'Show replies', vi: 'Hiện trả lời' },
  'comments.writeReply': { en: 'Write a reply...', vi: 'Viết trả lời...' },
  'comments.writeComment': { en: 'Write a comment...', vi: 'Viết bình luận...' },
  'comments.characters': { en: 'characters', vi: 'kí tự' },
  'comments.reply': { en: 'Reply', vi: 'Trả lời' },
  'comments.comment': { en: 'Comment', vi: 'Bình luận' },
  'comments.loadMoreComments': { en: 'Load more comments', vi: 'Tải thêm bình luận' },
  'comments.loadMoreReplies': { en: 'Load more replies', vi: 'Tải thêm trả lời' },
  'comments.noCommentsYet': {
    en: 'No comments yet. Be the first to comment!',
    vi: 'Chưa có bình luận nào. Hãy là người bình luận đầu tiên!',
  },
  'comments.signInToPost.prefix': { en: 'Please', vi: 'Vui lòng' },
  'comments.signInToPost.suffix': { en: 'to post comments.', vi: 'để bình luận.' },

  // Admin - Categories modal
  'admin.category.new': { en: 'New Category', vi: 'Danh mục mới' },
  'admin.category.name': { en: 'Name', vi: 'Tên' },
  'admin.category.namePlaceholder': { en: 'Enter category name', vi: 'Nhập tên danh mục' },
  'admin.category.description': { en: 'Description', vi: 'Mô tả' },
  'admin.category.descriptionPlaceholder': {
    en: 'Enter category description',
    vi: 'Nhập mô tả danh mục',
  },
  'admin.category.color': { en: 'Color', vi: 'Màu' },
  'admin.parentCategory': { en: 'Parent Category', vi: 'Danh mục cha' },
  'admin.category.noParentRoot': { en: 'No parent (Root Category)', vi: 'Không có (Danh mục gốc)' },

  // Share
  'share.share': { en: 'Share', vi: 'Chia sẻ' },
  'share.copyLink': { en: 'Copy link', vi: 'Sao chép liên kết' },
  'share.viaDevice': { en: 'Share via device', vi: 'Chia sẻ qua thiết bị' },
  'share.defaultTitle': { en: 'Check out this article', vi: 'Xem bài viết này' },
  'share.copiedTitle': { en: 'Copied', vi: 'Đã sao chép' },
  'share.copiedMessage': {
    en: 'Article link copied to clipboard',
    vi: 'Đã sao chép liên kết bài viết',
  },
  'share.failedTitle': { en: 'Failed', vi: 'Thất bại' },
  'share.failedMessage': { en: 'Could not copy link', vi: 'Không thể sao chép liên kết' },

  // Session Management
  'sessions.title': { en: 'Session Management', vi: 'Quản lý phiên đăng nhập' },
  'sessions.subtitle': {
    en: "Manage your active sessions across all devices. You can see where you're signed in and sign out of specific devices.",
    vi: 'Quản lý các phiên đăng nhập đang hoạt động trên tất cả thiết bị. Bạn có thể xem nơi đang đăng nhập và đăng xuất khỏi các thiết bị cụ thể.',
  },
  'sessions.activeSessions': { en: 'Active Sessions', vi: 'Phiên đăng nhập đang hoạt động' },
  'sessions.allSessions': { en: 'All Sessions', vi: 'Tất cả phiên' },
  'sessions.current': { en: 'Current', vi: 'Hiện tại' },
  'sessions.otherDevices': { en: 'Other Devices', vi: 'Thiết bị khác' },
  'sessions.terminateOtherSessions': { en: 'Terminate Other Sessions', vi: 'Kết thúc phiên khác' },
  'sessions.noSessionsFound': {
    en: 'No sessions found for the selected filter.',
    vi: 'Không tìm thấy phiên nào cho bộ lọc đã chọn.',
  },
  'sessions.unknownDevice': { en: 'Unknown Device', vi: 'Thiết bị không xác định' },
  'sessions.currentBadge': { en: 'Current', vi: 'Hiện tại' },
  'sessions.info': { en: 'Info', vi: 'Thông tin' },
  'sessions.terminate': { en: 'Terminate', vi: 'Kết thúc' },
  'sessions.sessionDetails': { en: 'Session Details', vi: 'Chi tiết phiên đăng nhập' },
  'sessions.sessionDetailsDescription': {
    en: 'Detailed information about this session.',
    vi: 'Thông tin chi tiết về phiên đăng nhập này.',
  },
  'sessions.deviceInformation': { en: 'Device Information', vi: 'Thông tin thiết bị' },
  'sessions.locationTime': { en: 'Location & Time', vi: 'Vị trí & Thời gian' },
  'sessions.country': { en: 'Country', vi: 'Quốc gia' },
  'sessions.loginTime': { en: 'Login Time', vi: 'Thời gian đăng nhập' },
  'sessions.lastActive': { en: 'Last Active', vi: 'Hoạt động cuối' },
  'sessions.unknown': { en: 'Unknown', vi: 'Không xác định' },
  'sessions.terminateSession': { en: 'Terminate Session', vi: 'Kết thúc phiên đăng nhập' },
  'sessions.terminateSessionDescription': {
    en: 'This will sign out the selected session from that device. The user will need to sign in again on that device.',
    vi: 'Điều này sẽ đăng xuất phiên đăng nhập đã chọn khỏi thiết bị đó. Người dùng sẽ cần đăng nhập lại trên thiết bị đó.',
  },
  'sessions.terminateOtherSessionsTitle': {
    en: 'Terminate Other Sessions',
    vi: 'Kết thúc các phiên khác',
  },
  'sessions.terminateOtherSessionsDescription': {
    en: "This will terminate all other sessions except your current one. You'll remain signed in on this device.",
    vi: 'Điều này sẽ kết thúc tất cả các phiên khác ngoại trừ phiên hiện tại của bạn. Bạn sẽ vẫn đăng nhập trên thiết bị này.',
  },
  'sessions.terminateSessionButton': { en: 'Terminate Session', vi: 'Kết thúc phiên đăng nhập' },
  'sessions.terminateOtherSessionsButton': {
    en: 'Terminate Other Sessions',
    vi: 'Kết thúc các phiên khác',
  },
  'sessions.loadingSessions': {
    en: 'Loading session management...',
    vi: 'Đang tải quản lý phiên đăng nhập...',
  },
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'vi',
      setLocale: (locale) => set({ locale }),
      t: (key) => {
        const { locale } = get();
        const entry = store[key];
        return entry ? (entry[locale] ?? key) : key;
      },
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);
