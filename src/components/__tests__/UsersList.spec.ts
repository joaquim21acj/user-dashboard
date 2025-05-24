import { mount, VueWrapper } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, computed, nextTick, type Ref, reactive } from 'vue';
import UsersList from '../UsersList.vue';
import type { User } from '@/stores/user';
import { createPinia, setActivePinia } from 'pinia';

// --- Test-controlled reactive state for the mock store ---
const mockUsersState: Ref<User[]> = ref([]);
const mockIsLoadingState = ref(false);
const mockHasErrorState = ref(false);
const mockErrorState: Ref<string | null> = ref(null);
const mockLastUpdatedUserIdsState: Ref<number[]> = ref([]);

// --- Central object holding the refs and spies (for easier reset and access) ---
const mockStoreInternals = {
  usersRef: mockUsersState,
  isLoadingRef: mockIsLoadingState,
  hasErrorRef: mockHasErrorState,
  errorRef: mockErrorState,
  lastUpdatedUserIdsRef: mockLastUpdatedUserIdsState,
  userCountComputed: computed(() => mockUsersState.value.length),
  sortedUsersComputed: computed(() => {
    return mockUsersState.value
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((user, index, arr) => {
        const rank = arr.filter(u => u.score > user.score).length + 1;
        return { ...user, rank };
      });
  }),
  fetchUsersSpy: vi.fn(),
  refreshUserScoresSpy: vi.fn(),
  updateUserScoreSpy: vi.fn(),
};

// --- Mocking the Pinia Store Import ---
vi.mock('@/stores/user', () => ({
  useUserStore: () => reactive({
    get users() { return mockStoreInternals.usersRef.value; },
    get isLoading() { return mockStoreInternals.isLoadingRef.value; },
    get hasError() { return mockStoreInternals.hasErrorRef.value; },
    get error() { return mockStoreInternals.errorRef.value; },
    get lastUpdatedUserIds() { return mockStoreInternals.lastUpdatedUserIdsRef.value; },

    get userCount() { return mockStoreInternals.userCountComputed.value; },
    get sortedUsers() { return mockStoreInternals.sortedUsersComputed.value; },

    fetchUsers: mockStoreInternals.fetchUsersSpy,
    refreshUserScores: mockStoreInternals.refreshUserScoresSpy,
    updateUserScore: mockStoreInternals.updateUserScoreSpy,
  })
}));

const generateMockUsers = (count: number, baseScore = 50): User[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Test User ${i + 1}`,
    email: `test${i + 1}@example.com`,
    score: baseScore + i * 5,
    rank: 0,
  }));
};

describe('UsersList.vue', () => {
  let wrapper: VueWrapper<any>;

  const createComponent = (props = {}) => {
    wrapper = mount(UsersList, {
      props,
      global: {
        stubs: {},
      }
    });
  };

  beforeEach(() => {
    setActivePinia(createPinia());

    mockStoreInternals.usersRef.value = [];
    mockStoreInternals.isLoadingRef.value = false;
    mockStoreInternals.hasErrorRef.value = false;
    mockStoreInternals.errorRef.value = null;
    mockStoreInternals.lastUpdatedUserIdsRef.value = [];

    mockStoreInternals.fetchUsersSpy.mockReset();
    mockStoreInternals.refreshUserScoresSpy.mockReset();
    mockStoreInternals.updateUserScoreSpy.mockReset();

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // --- Rendering States ---
  it('displays loading message when isLoading is true', async () => {
    mockStoreInternals.isLoadingRef.value = true;
    createComponent();
    await nextTick();
    expect(wrapper.find('.users').exists()).toBe(false);
    expect(wrapper.find('.error-message').exists()).toBe(false);
    expect(wrapper.find('.no-users-found').exists()).toBe(false);
  });

  it('displays error message when hasError is true', async () => {
    mockStoreInternals.hasErrorRef.value = true;
    mockStoreInternals.errorRef.value = 'Network Failed';
    createComponent();
    await nextTick();

    const errorMsg = wrapper.find('.error-message p');
    expect(errorMsg.exists()).toBe(true);
    expect(errorMsg.text()).toContain('⚠️ Error: Network Failed');
  });

  it('displays "No users found" message when there are no users, not loading, and no error', async () => {
    mockStoreInternals.usersRef.value = [];
    mockStoreInternals.isLoadingRef.value = false;
    mockStoreInternals.hasErrorRef.value = false;
    createComponent();
    await nextTick();

    const noUsersMsg = wrapper.find('.no-users-found p');
    expect(noUsersMsg.exists()).toBe(true);
    expect(noUsersMsg.text()).toContain('🤷 No users found');
  });

  it('displays the user table with correct data when users are present', async () => {
    const users = generateMockUsers(2);
    mockStoreInternals.usersRef.value = users;
    createComponent();
    await nextTick();

    const userRows = wrapper.findAll('tbody tr');
    expect(userRows.length).toBe(2);
    expect(wrapper.find('.users > p').text()).toBe('Total Users: 2');

    // User 2 (score 55, rank 1)
    const cellsUser2 = userRows[0].findAll('td');
    expect(cellsUser2[0].find('div').text()).toBe('1');
    expect(cellsUser2[1].text()).toBe('Test User 2');
    expect(cellsUser2[2].find('span').text()).toBe('55');

    // User 1 (score 50, rank 2)
    const cellsUser1 = userRows[1].findAll('td');
    expect(cellsUser1[0].find('div').text()).toBe('2');
    expect(cellsUser1[1].text()).toBe('Test User 1');
    expect(cellsUser1[2].find('span').text()).toBe('50');
  });

  it('highlights recently updated users', async () => {
    const users = generateMockUsers(3);
    mockStoreInternals.usersRef.value = users;
    mockStoreInternals.lastUpdatedUserIdsRef.value = [users[1].id];
    createComponent();
    await nextTick();

    const userRows = wrapper.findAll('tbody tr');

    const user2Row = userRows.find(row => row.findAll('td')[1].text() === 'Test User 2');
    expect(user2Row).toBeDefined();
    expect(user2Row!.classes('highlighted-row')).toBe(true);
    expect(user2Row!.find('td:first-child small').text()).toBe('Recently Updated');

    const user3Row = userRows.find(row => row.findAll('td')[1].text() === 'Test User 3');
    expect(user3Row!.classes('highlighted-row')).toBe(false);
  });

  // --- Edit Mode Interactions ---
  describe('Edit Mode', () => {
    let userToEdit: User;
    let userRow: VueWrapper<Element>;

    beforeEach(async () => {
      const users = generateMockUsers(1, 75);
      userToEdit = users[0];
      mockStoreInternals.usersRef.value = users;
      createComponent();
      await nextTick();
      userRow = wrapper.find('tbody tr') as unknown as VueWrapper<Element>;
    });

    it('enters edit mode when "Edit" button is clicked', async () => {
      await userRow.find('td:last-child button').trigger('click');
      await nextTick();

      expect(userRow.find('input[type="number"]').exists()).toBe(true);
      expect(userRow.find('button.save-button').exists()).toBe(true);
      expect(userRow.find('button.cancel-button').exists()).toBe(true);
      expect((userRow.find('input[type="number"]').element as HTMLInputElement).value).toBe(userToEdit.score.toString());
    });

    it('saves score and exits edit mode when "Save" button is clicked', async () => {
      await userRow.find('td:last-child button').trigger('click');
      await nextTick();

      const scoreInput = userRow.find('input[type="number"]');
      await scoreInput.setValue('88');
      await userRow.find('button.save-button').trigger('click');
      await nextTick();

      expect(mockStoreInternals.updateUserScoreSpy).toHaveBeenCalledTimes(1);
      expect(mockStoreInternals.updateUserScoreSpy).toHaveBeenCalledWith(userToEdit.id, 88);

      expect(userRow.find('input[type="number"]').exists()).toBe(false);
      expect(userRow.find('button.save-button').exists()).toBe(false);
      expect(userRow.find('button.cancel-button').exists()).toBe(false);
      expect(userRow.find('td:last-child button').text()).toBe('Edit');
    });

    it('cancels edit and exits edit mode when "Cancel" button is clicked', async () => {
      await userRow.find('td:last-child button').trigger('click');
      await nextTick();
      await userRow.find('input[type="number"]').setValue('99');
      await nextTick();
      await userRow.find('button.cancel-button').trigger('click');
      await nextTick();

      expect(mockStoreInternals.updateUserScoreSpy).not.toHaveBeenCalled();
      expect(userRow.find('input[type="number"]').exists()).toBe(false);
      expect(userRow.find('td:last-child button').text()).toBe('Edit');
      expect(userRow.find('td.column-score span').text()).toBe(userToEdit.score.toString());
    });
  });

  // --- Lifecycle and Timers ---
  describe('Lifecycle and Timers', () => {
    it('calls fetchUsers on mount if userCount is 0', async () => { 
      mockStoreInternals.usersRef.value = [];
      createComponent();
      await nextTick();
      expect(mockStoreInternals.fetchUsersSpy).toHaveBeenCalledTimes(1);
    });

    it('does not call fetchUsers on mount if userCount is greater than 0', async () => {
      mockStoreInternals.usersRef.value = generateMockUsers(1); // userCount is 1
      createComponent();
      await nextTick();
      expect(mockStoreInternals.fetchUsersSpy).not.toHaveBeenCalled();
    });

    it('starts refreshing users interval on mount and calls refreshUserScores', async () => {
      createComponent();
      mockStoreInternals.fetchUsersSpy.mockResolvedValue(undefined);
      mockStoreInternals.refreshUserScoresSpy.mockResolvedValue(undefined);

      await nextTick();

      expect(mockStoreInternals.refreshUserScoresSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(30000);
      expect(mockStoreInternals.refreshUserScoresSpy).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(30000);
      expect(mockStoreInternals.refreshUserScoresSpy).toHaveBeenCalledTimes(2);
    });

    it('stops refreshing users interval on unmount', async () => {
      createComponent();
      mockStoreInternals.fetchUsersSpy.mockResolvedValue(undefined);
      mockStoreInternals.refreshUserScoresSpy.mockResolvedValue(undefined);
      await nextTick();


      await vi.advanceTimersByTimeAsync(30000);
      expect(mockStoreInternals.refreshUserScoresSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();

      await vi.advanceTimersByTimeAsync(60000);
      expect(mockStoreInternals.refreshUserScoresSpy).toHaveBeenCalledTimes(1);
    });
  });
});
