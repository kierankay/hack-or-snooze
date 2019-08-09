$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $userFunctions = $("#user-functions");
  const $submitStory = $("#submit-story");
  const $favoriteArticles = $('#favorited-articles');
  const $userProfile = $('#user-profile');
  const $myArticles = $('#my-articles');
  const $editForm = $('#edit-form');

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    await User.create(username, password, name).then(function (response) {
      currentUser = response;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    }).catch(function (err) {
      console.log(`account creation error: duplicate username`)
      if (err.response.data.error.status === 409) {
        $('#login-pass-failure').removeClass('hidden');
      };
    });
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
    checkForFavorites();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      checkForFavorites();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="star">
          <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <div>
          <small class="article-username">posted by ${story.username}</small>
        </div>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $favoriteArticles,
      $userProfile,
      $editForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $userFunctions.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

  $submitStory.on('click', function () {
    $submitForm.slideToggle();
  })

  $submitForm.on('submit', function () {
    const storyObj = {
      author: $('#author').val(),
      title: $('#title').val(),
      url: $('#url').val(),
      storyid: $('#story-id').val()
    };
    storyList.addStory(currentUser, storyObj).then(async function (response) {
      console.log(response);
      await generateStories();
      refreshUser();
      return response;
    });
    $submitForm.slideToggle();
  })

  $('body').on('click', '.star', async function (e) {

    let newFavoriteId = (e.target.parentNode.parentNode.id);
    let foundIndex = currentUser.favorites.findIndex(story => story.storyId === newFavoriteId);

    if (foundIndex >= 0) {
      await currentUser.removeFavorite(newFavoriteId, currentUser.username, currentUser.loginToken).then(
        // only remove from the favorites array if successfully removed from the server
        function () {
          currentUser.favorites.splice(foundIndex, 1);
        }
      );
    } else {
      await currentUser.addFavorite(newFavoriteId, currentUser.username, currentUser.loginToken).then(
        // only add to the favorites array if successfully added to the server 
        function () {
          currentUser.favorites.push({
            storyId: newFavoriteId
          });
        })
    }

    refreshUser();
    $(e.target).toggleClass("far").toggleClass("fas");

  });

  async function checkForFavorites() {
    refreshUser();
    // empty the favorite articles
    $favoriteArticles.empty();
    for (let favorite of currentUser.favorites) {

      // get the story ID of a story
      let storyElementId = favorite.storyId;
      toggleStoryStar($(`#${storyElementId}`))

      // generate the favorited story's HTML element and append it to the favorites page
      let storyHtml = generateStoryHTML(favorite);
      toggleStoryStar(storyHtml)
      $favoriteArticles.append(storyHtml);

    }
  }

  $('#view-favorites').on('click', function () {
    checkForFavorites();
    hideElements();
    $favoriteArticles.toggle()
  })

  $('#view-my-articles').on('click', function () {
    updateArticles();
  })


  function updateArticles() {
    hideElements();
    $myArticles.toggle();
    $myArticles.empty();
    console.log(currentUser.ownStories);
    let storiesList = currentUser.ownStories
    for (var i = storiesList.length - 1; i >= 0; i--) {
      let newStory = generateStoryHTML(storiesList[i]);
      newStory.children(':last-child').append(`<a class="hidden" href="#"><small class="article-edit">edit article</small></a>`);
      let foundIndex = currentUser.favorites.findIndex(story => story.storyId === newStory[0].id);
      if (foundIndex >= 0) {
        toggleStoryStar(newStory);
      };
      $myArticles.append(newStory);
    }
  }

  $('#my-articles').on('mouseover', 'li', function (e) {
    $(e.currentTarget).children(':last-child').children(':last-child').removeClass('hidden');
  }).on('mouseleave', 'li', function (e) {
    $(e.currentTarget).children(':last-child').children(':last-child').addClass('hidden');
  })

  function toggleStoryStar(jQueryStoryElement) {
    jQueryStoryElement.children(':first-child').children(':first-child').toggleClass("far").toggleClass("fas");
  }

  async function refreshUser() {
    currentUser = await User.getLoggedInUser(currentUser.loginToken, currentUser.username);

  }


  $('body').on('click', '.article-edit', function (e) {
    $editForm.slideToggle();
    console.log(e.target.parentNode.parentNode.parentNode);
    let retrievedArticle = $(e.target.parentNode.parentNode.parentNode).children(':nth-child(2)').children(':nth-child(1)').text();
    $('#edit-title').val(retrievedArticle);
    let retrievedAuthor = $(e.target.parentNode.parentNode.parentNode).children(':nth-child(3)').text().split(' ')[1];
    $('#edit-author').val(retrievedAuthor);
    let retrievedLink = $(e.target.parentNode.parentNode.parentNode).children(':nth-child(2)').attr('href');
    $('#edit-url').val(retrievedLink).attr('disabled', true);
    let retrievedId = $(e.target.parentNode.parentNode.parentNode).attr('id');
    $('#story-id').val(retrievedId);


  })

  $('#edit-update').on('click', async function (e) {
    let editedTitle = $('#edit-title').val();
    let editedAuthor = $('#edit-author').val();
    let storyId = $('#story-id').val();
    let token = currentUser.loginToken;
    await storyList.updateStory(token, editedAuthor, editedTitle, storyId).then(async function () {
      await refreshUser();
      updateArticles();
    }).catch(function (err) {
      console.log(err.response);
    });
  });

  $(window).scroll(async function () {
    let skipStories = 25;
    let reloaded = false;
    if ($(window).scrollTop() - 20 === ($(document).height() - $(window).height()) && reloaded === false) {
      reloaded = true;
      $('#scroll-more').toggle();
      $('#loading-more').toggle();
      await StoryList.getStories(skipStories).then(function (response) {
        const storyCache = response.stories;
        storyList.stories = storyList.stories.concat(storyCache);
        for (let story of storyCache) {
          const result = generateStoryHTML(story);
          $allStoriesList.append(result);
        }
        $('#scroll-more').toggle();
        $('#loading-more').toggle();
        skipStories += 25;
        reloaded = false;
      }).catch(function(err) {
        console.log(err);
      });
    };
  })

});